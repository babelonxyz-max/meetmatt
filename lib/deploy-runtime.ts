import { prisma } from "@/lib/prisma";
import { ensurePrimaryTelegramIdentityForAgent } from "@/lib/agent-telegram";
import { createDevinSession } from "@/lib/devin";
import { createOpenClawSession, resolveDeployProvider } from "@/lib/reallyopenclaw";
import { deriveAgentBlueprint, TRANSPORT_PROVIDER } from "@/lib/agent-blueprint";

export type DeploymentProvider = "devin" | "openclaw";

export interface DeployExecutionResult {
  provider: DeploymentProvider;
  deployState: "provisioning" | "active";
  openclawAgentId?: string;
  sessionId: string;
  url: string;
}

export function isDeployableAgentState(agent: {
  status: string;
  deployState: string;
  activationStatus: string;
}): boolean {
  if (agent.status === "pending" || agent.status === "error") {
    return true;
  }
  if (agent.deployState === "queued" || agent.deployState === "failed" || agent.deployState === "provisioning") {
    return true;
  }
  if (agent.status === "deploying" && agent.activationStatus !== "active") {
    return true;
  }
  return false;
}

export async function executeAgentDeployment(agentId: string): Promise<DeployExecutionResult> {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    throw { status: 404, message: "Agent not found" };
  }

  const blueprint = deriveAgentBlueprint(agent);
  const provider = resolveDeployProvider(
    blueprint.productUseCase,
    blueprint.deploymentProvider,
  );

  // Idempotent return for already-active runtime sessions.
  if (
    agent.status === "active" &&
    agent.deployState === "active" &&
    agent.runtimeProvider === provider &&
    (agent.runtimeSessionId || agent.devinSessionId) &&
    (agent.runtimeUrl || agent.devinUrl)
  ) {
    return {
      provider,
      deployState: "active",
      openclawAgentId: agent.runtimeAgentId || undefined,
      sessionId: (agent.runtimeSessionId || agent.devinSessionId)!,
      url: (agent.runtimeUrl || agent.devinUrl)!,
    };
  }

  // Idempotent return for existing in-flight Devin sessions.
  if (
    provider === "devin" &&
    agent.devinSessionId &&
    agent.devinUrl &&
    (agent.status === "deploying" || agent.deployState === "provisioning")
  ) {
    return {
      provider: "devin",
      deployState: "provisioning",
      sessionId: agent.devinSessionId,
      url: agent.devinUrl,
    };
  }

  if (!isDeployableAgentState(agent)) {
    throw { status: 400, message: "Agent cannot be deployed in current state" };
  }

  const telegramLaunch = await ensurePrimaryTelegramIdentityForAgent(agent.id);
  if (
    agent.transportProvider === TRANSPORT_PROVIDER.telegramBotApi &&
    (!telegramLaunch?.botAssigned || !telegramLaunch.botToken)
  ) {
    throw {
      status: 400,
      message: "Assign a primary Telegram bot before deployment",
    };
  }

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      deploymentProvider: provider,
      runtimeProvider: provider,
      deployState: "provisioning",
      deployErrorCode: null,
      deployErrorMessage: null,
      status: "deploying",
      activationStatus: "activating",
    },
  });

  if (provider === "openclaw") {
    const openclawSession = await createOpenClawSession({
      agentId: agent.id,
      name: agent.name,
    });

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        runtimeProvider: "openclaw",
        runtimeAgentId: openclawSession.openclawAgentId,
        runtimeSessionId: openclawSession.sessionId,
        runtimeUrl: openclawSession.url,
        devinSessionId: openclawSession.sessionId,
        devinUrl: openclawSession.url,
        status: "active",
        activationStatus: "active",
        deployState: "active",
        deployErrorCode: null,
        deployErrorMessage: null,
        deployed_at: new Date(),
        lastHeartbeatAt: new Date(),
      },
    });

    return {
      provider: "openclaw",
      deployState: "active",
      openclawAgentId: openclawSession.openclawAgentId,
      sessionId: openclawSession.sessionId,
      url: openclawSession.url,
    };
  }

  const devinSession = await createDevinSession({
    name: agent.name,
    useCase: blueprint.productUseCase,
    scope: blueprint.personalityPreset,
    contactMethod: "telegram",
    telegramBotToken: telegramLaunch?.botToken ?? undefined,
    telegramBotUsername: telegramLaunch?.botUsername ?? agent.botUsername ?? undefined,
  });

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      runtimeProvider: "devin",
      runtimeAgentId: devinSession.sessionId,
      runtimeSessionId: devinSession.sessionId,
      runtimeUrl: devinSession.url,
      devinSessionId: devinSession.sessionId,
      devinUrl: devinSession.url,
      status: "deploying",
      activationStatus: "activating",
      deployState: "provisioning",
      deployErrorCode: null,
      deployErrorMessage: null,
    },
  });

  return {
    provider: "devin",
    deployState: "provisioning",
    sessionId: devinSession.sessionId,
    url: devinSession.url,
  };
}
