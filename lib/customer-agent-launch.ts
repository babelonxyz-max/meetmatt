import { prisma } from "@/lib/prisma";
import { buildCustomerAgentDefaults } from "@/lib/agent-blueprint";
import { provisionCustomerProvidedTelegramBotForAgent } from "@/lib/agent-telegram";
import { provisionAgentUseCaseBundle } from "@/lib/capability-commerce/provisioning";
import { sanitizeAgentName, sanitizeText } from "@/lib/sanitize";
import { fetchTelegramBotProfile } from "@/lib/telegram-bot-api";

export async function createPendingCustomerAgent(params: {
  userId: string;
  workspaceId: string | null;
  agentName: string;
  personality: string;
  useCase?: string | null;
  useCaseSlug?: string | null;
  telegramBotToken: string;
  source?: string | null;
}) {
  const normalizedUseCase = params.useCase === "fleet" ? "fleet" : "assistant";
  const explicitUseCaseTemplateSlug = params.useCaseSlug?.trim() || null;
  const sanitizedName = sanitizeAgentName(params.agentName);
  const sanitizedPersonality = sanitizeText(params.personality, 500);

  if (!sanitizedName || !sanitizedPersonality) {
    throw { status: 400, message: "agentName and personality required" };
  }

  if (!params.telegramBotToken.trim()) {
    throw {
      status: 400,
      message: "telegramBotToken required until automatic bot creation is live",
    };
  }

  const botProfile = await fetchTelegramBotProfile(params.telegramBotToken);
  const baseSlug = sanitizedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const defaults = buildCustomerAgentDefaults({
    personality: sanitizedPersonality,
    useCase: normalizedUseCase,
  });

  const agent = await prisma.agent.create({
    data: {
      sessionId,
      slug: uniqueSlug,
      name: sanitizedName,
      purpose: sanitizedPersonality,
      features: [
        JSON.stringify({
          personality: sanitizedPersonality,
          useCase: normalizedUseCase,
        }),
      ],
      tier: "matt",
      status: "pending",
      userId: params.userId,
      workspaceId: params.workspaceId,
      ownerType: defaults.ownerType,
      agentKind: defaults.agentKind,
      productUseCase: defaults.productUseCase,
      personalityPreset: defaults.personalityPreset,
      transportProvider: defaults.transportProvider,
      brainProvider: defaults.brainProvider,
      deploymentProvider: defaults.deploymentProvider,
      cortexId: defaults.cortexId,
      botUsername: botProfile.username,
      telegramLink: botProfile.telegramLink,
      activationStatus: "pending",
      metadata: {
        telegramLaunch: {
          provisioningMode: "customer_provided_bot",
        },
        customerProvidedTelegramBot: {
          id: botProfile.id,
          username: botProfile.username,
          firstName: botProfile.firstName,
          connectedAt: new Date().toISOString(),
        },
        launchSource: params.source?.trim() || "customer-flow",
      },
    },
  });

  try {
    await provisionAgentUseCaseBundle({
      agentId: agent.id,
      useCaseTemplateSlug: explicitUseCaseTemplateSlug,
    });

    await provisionCustomerProvidedTelegramBotForAgent({
      agentId: agent.id,
      userId: params.userId,
      workspaceId: params.workspaceId,
      agentName: sanitizedName,
      botId: botProfile.id,
      botUsername: botProfile.username,
      botFirstName: botProfile.firstName,
      botToken: params.telegramBotToken,
    });
  } catch (provisionError) {
    await prisma.agent.delete({
      where: { id: agent.id },
    }).catch(() => undefined);
    throw provisionError;
  }

  return agent;
}
