import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  deriveAgentBlueprint,
  TRANSPORT_PROVIDER,
} from "@/lib/agent-blueprint";
import { ensurePrimaryTelegramIdentityForAgent } from "@/lib/agent-telegram";
import { activateAgentCapabilityEntitlements } from "@/lib/capability-commerce/provisioning";
import { enqueueDeployJob, shouldUseDeployJobs } from "@/lib/deploy-jobs";
import { executeAgentDeployment, isDeployableAgentState } from "@/lib/deploy-runtime";
import { getErrorMessage, getStatusError } from "@/lib/http-error";
import { resolveDeployProvider } from "@/lib/reallyopenclaw";
import { activateTrial } from "@/lib/subscription";

function buildOwnedAgentScope(userId: string, workspaceId: string | null) {
  return [
    ...(workspaceId ? [{ workspaceId }] : []),
    {
      workspaceId: null,
      userId,
    },
  ];
}

export async function POST(req: NextRequest) {
  let agentId = "";

  try {
    const { userId, workspaceId } = await requireAuth(req);
    const body = await req.json();
    agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (
      !agent ||
      (
        agent.workspaceId !== workspaceId &&
        !(agent.workspaceId === null && agent.userId === userId)
      )
    ) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const trialAlreadyStarted =
      agent.subscriptionType === "trial" &&
      agent.currentPeriodStart !== null &&
      agent.currentPeriodEnd !== null;
    const trialWindowOpen =
      trialAlreadyStarted &&
      agent.currentPeriodEnd !== null &&
      new Date(agent.currentPeriodEnd) > new Date();

    if (trialAlreadyStarted && !trialWindowOpen) {
      return NextResponse.json(
        { error: "This 1-day trial has already ended. Continue with a paid launch instead." },
        { status: 409 },
      );
    }

    if (!trialAlreadyStarted) {
      const previousTrial = await prisma.agent.findFirst({
        where: {
          id: { not: agent.id },
          subscriptionType: "trial",
          currentPeriodStart: { not: null },
          status: { not: "deleted" },
          OR: buildOwnedAgentScope(userId, workspaceId),
        },
        select: {
          id: true,
        },
      });

      if (previousTrial) {
        return NextResponse.json(
          { error: "The 1-day trial has already been used for this workspace." },
          { status: 409 },
        );
      }
    }

    const telegramLaunch = await ensurePrimaryTelegramIdentityForAgent(agent.id);
    if (
      !telegramLaunch?.botAssigned ||
      (
        (telegramLaunch.transportProvider === TRANSPORT_PROVIDER.telegramBotApi ||
          agent.transportProvider === TRANSPORT_PROVIDER.telegramBotApi) &&
        !telegramLaunch.botToken
      )
    ) {
      return NextResponse.json(
        { error: "Assign a Telegram bot before starting the trial." },
        { status: 400 },
      );
    }

    if (!trialAlreadyStarted) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          ...activateTrial(1),
          lastPaymentId: null,
        },
      });

      await activateAgentCapabilityEntitlements(agent.id);
    }

    const refreshedAgent = await prisma.agent.findUnique({
      where: { id: agent.id },
    });

    if (!refreshedAgent) {
      throw { status: 404, message: "Agent not found" };
    }

    if (
      refreshedAgent.status === "active" &&
      refreshedAgent.activationStatus === "active" &&
      refreshedAgent.deployState === "active"
    ) {
      return NextResponse.json({
        success: true,
        agentId: refreshedAgent.id,
        queued: false,
        provider: refreshedAgent.runtimeProvider ?? refreshedAgent.deploymentProvider,
        deployState: refreshedAgent.deployState,
      });
    }

    if (refreshedAgent.deployState === "queued") {
      return NextResponse.json({
        success: true,
        agentId: refreshedAgent.id,
        queued: true,
        provider: refreshedAgent.runtimeProvider ?? refreshedAgent.deploymentProvider,
        deployState: refreshedAgent.deployState,
      });
    }

    if (!isDeployableAgentState(refreshedAgent)) {
      return NextResponse.json(
        { error: "Agent cannot be trial-launched in its current state." },
        { status: 400 },
      );
    }

    const blueprint = deriveAgentBlueprint(refreshedAgent);
    const provider = resolveDeployProvider(
      blueprint.productUseCase,
      blueprint.deploymentProvider,
    );

    if (shouldUseDeployJobs()) {
      const job = await enqueueDeployJob({
        agentId: refreshedAgent.id,
        providerHint: provider,
      });

      await prisma.agent.update({
        where: { id: refreshedAgent.id },
        data: {
          deploymentProvider: provider,
          runtimeProvider: provider,
          deployState: "queued",
          deployErrorCode: null,
          deployErrorMessage: null,
          status: refreshedAgent.status === "error" ? "pending" : refreshedAgent.status,
          activationStatus:
            refreshedAgent.activationStatus === "failed"
              ? "activating"
              : refreshedAgent.activationStatus,
        },
      });

      return NextResponse.json({
        success: true,
        agentId: refreshedAgent.id,
        queued: true,
        provider,
        deployState: "queued",
        jobId: job.jobId,
      });
    }

    try {
      const result = await executeAgentDeployment(refreshedAgent.id);
      return NextResponse.json({
        success: true,
        agentId: refreshedAgent.id,
        queued: false,
        provider: result.provider,
        deployState: result.deployState,
        openclawAgentId: result.openclawAgentId,
        sessionId: result.sessionId,
        url: result.url,
      });
    } catch (error: unknown) {
      const statusError = getStatusError(error);
      const errorMessage = getErrorMessage(error, "Trial launch failed");

      await prisma.agent.update({
        where: { id: refreshedAgent.id },
        data: {
          status: "error",
          activationStatus: "failed",
          deployState: "failed",
          deployErrorCode:
            statusError?.status ? `HTTP_${statusError.status}` : "TRIAL_LAUNCH_FAILED",
          deployErrorMessage: errorMessage.slice(0, 500),
        },
      }).catch(() => undefined);

      if (statusError) {
        return NextResponse.json({ error: statusError.message }, { status: statusError.status });
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("[Agent/Trial] Error:", { agentId, error });
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
