import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeployProvider } from "@/lib/reallyopenclaw";
import { requireAuth } from "@/lib/auth";
import { safeCompare } from "@/lib/crypto-utils";
import { getStatusError } from "@/lib/http-error";
import { enqueueDeployJob, shouldUseDeployJobs } from "@/lib/deploy-jobs";
import { executeAgentDeployment, isDeployableAgentState } from "@/lib/deploy-runtime";
import { deriveAgentBlueprint } from "@/lib/agent-blueprint";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    // Allow internal webhook secret OR authenticated user
    const internalSecret = req.headers.get("x-internal-secret");
    const isInternalCall = !!process.env.INTERNAL_WEBHOOK_SECRET && safeCompare(internalSecret ?? "", process.env.INTERNAL_WEBHOOK_SECRET);

    if (!isInternalCall) {
      const { userId, workspaceId } = await requireAuth(req);
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { workspaceId: true, userId: true },
      });
      if (
        !agent ||
        !(
          agent.workspaceId === workspaceId ||
          (!agent.workspaceId && agent.userId === userId)
        )
      ) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!isDeployableAgentState(agent)) {
      return NextResponse.json({ error: "Agent cannot be deployed in current state" }, { status: 400 });
    }

    const blueprint = deriveAgentBlueprint(agent);
    const provider = resolveDeployProvider(
      blueprint.productUseCase,
      blueprint.deploymentProvider,
    );

    if (shouldUseDeployJobs()) {
      const enqueued = await enqueueDeployJob({
        agentId: agent.id,
        providerHint: provider,
      });
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          deploymentProvider: provider,
          runtimeProvider: provider,
          deployState: "queued",
          deployErrorCode: null,
          deployErrorMessage: null,
          status: agent.status === "error" ? "pending" : agent.status,
          activationStatus: agent.activationStatus === "failed" ? "activating" : agent.activationStatus,
        },
      });

      return NextResponse.json({
        success: true,
        queued: true,
        provider,
        jobId: enqueued.jobId,
        jobStatus: enqueued.status,
        created: enqueued.created,
      });
    }

    const result = await executeAgentDeployment(agent.id);

    return NextResponse.json({
      success: true,
      queued: false,
      provider: result.provider,
      deployState: result.deployState,
      openclawAgentId: result.openclawAgentId,
      sessionId: result.sessionId,
      url: result.url,
    });

  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("[TriggerDeploy] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
