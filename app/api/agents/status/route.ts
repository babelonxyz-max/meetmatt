import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAgentTelegramLaunchState } from "@/lib/agent-telegram";
import { requireAuth } from "@/lib/auth";
import { getStatusError } from "@/lib/http-error";

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Verify ownership
    if (
      agent.workspaceId !== workspaceId &&
      !(agent.workspaceId === null && agent.userId === userId)
    ) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const telegramLaunch = await getAgentTelegramLaunchState(agent.id);

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      activationStatus: agent.activationStatus,
      deployState: agent.deployState,
      ownerType: agent.ownerType,
      agentKind: agent.agentKind,
      productUseCase: agent.productUseCase,
      useCaseTemplateId: agent.useCaseTemplateId,
      workerTier: agent.workerTier,
      loadoutVersion: agent.loadoutVersion,
      transportProvider: agent.transportProvider,
      brainProvider: agent.brainProvider,
      deploymentProvider: agent.deploymentProvider,
      runtimeProvider: agent.runtimeProvider,
      runtimeAgentId: agent.runtimeAgentId,
      runtimeSessionId: agent.runtimeSessionId,
      runtimeUrl: agent.runtimeUrl,
      deployErrorCode: agent.deployErrorCode,
      deployErrorMessage: agent.deployErrorMessage,
      lastHeartbeatAt: agent.lastHeartbeatAt,
      lastTransportHeartbeatAt: agent.lastTransportHeartbeatAt,
      devinUrl: agent.devinUrl,
      botAssigned: telegramLaunch?.botAssigned ?? false,
      primaryTelegramIdentityId: telegramLaunch?.primaryTelegramIdentityId ?? null,
      botOwnershipType: telegramLaunch?.botOwnershipType ?? null,
      telegramProvisioningMode: telegramLaunch?.telegramProvisioningMode ?? null,
      botUsername: telegramLaunch?.botUsername ?? agent.botUsername,
      telegramLink: telegramLaunch?.telegramLink ?? agent.telegramLink,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    });

  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("[Agent/Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
