import { Prisma } from "@prisma/client";
import { TRANSPORT_PROVIDER } from "@/lib/agent-blueprint";
import { prisma } from "@/lib/prisma";
import { buildTelegramLink } from "@/lib/telegram-bot-api";
import {
  TELEGRAM_IDENTITY_KIND,
  TELEGRAM_IDENTITY_OWNERSHIP,
  TELEGRAM_IDENTITY_STATUS,
  getPrimaryTelegramIdentityForAgent,
  provisionTelegramIdentity,
  updateTelegramIdentityCredentials,
} from "@/lib/telegram-identities";
import { readStoredSecret } from "@/lib/secrets";

export const TELEGRAM_PROVISIONING_MODE = {
  customerProvidedBot: "customer_provided_bot",
  meetMattManagedBot: "meetmatt_managed_bot",
} as const;

export type TelegramProvisioningMode =
  (typeof TELEGRAM_PROVISIONING_MODE)[keyof typeof TELEGRAM_PROVISIONING_MODE];

type AgentWithTelegramLinks = Prisma.AgentGetPayload<{
  include: {
    telegramIdentities: {
      include: {
        telegramIdentity: true;
      };
    };
  };
}>;

type AgentTelegramLaunchState = {
  primaryTelegramIdentityId: string | null;
  botAssigned: boolean;
  botOwnershipType: string | null;
  telegramProvisioningMode: TelegramProvisioningMode | null;
  botUsername: string | null;
  telegramLink: string | null;
  transportProvider: string | null;
  identityStatus: string | null;
  botToken: string | null;
};

function asRecord(
  value?: Prisma.JsonValue | Prisma.InputJsonValue | null,
): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function mergeJson(
  current?: Prisma.JsonValue | Prisma.InputJsonValue | null,
  patch?: Prisma.InputJsonValue,
): Prisma.InputJsonValue {
  return {
    ...asRecord(current),
    ...asRecord(patch),
  } as Prisma.InputJsonObject;
}

function mergeAgentMetadata(
  current: Prisma.JsonValue | null,
  mode: TelegramProvisioningMode,
  extra?: Prisma.InputJsonValue,
): Prisma.InputJsonValue {
  const base = asRecord(current);
  const existingLaunch = asRecord(base.telegramLaunch as Prisma.JsonValue | undefined);

  return {
    ...base,
    telegramLaunch: {
      ...existingLaunch,
      provisioningMode: mode,
      ...asRecord(extra),
    },
  } as Prisma.InputJsonObject;
}

function readProvisioningMode(
  metadata: Prisma.JsonValue | null,
): TelegramProvisioningMode | null {
  const launch = asRecord(metadata).telegramLaunch;
  if (!launch || Array.isArray(launch) || typeof launch !== "object") {
    return null;
  }

  const provisioningMode = (launch as Record<string, unknown>).provisioningMode;
  if (
    provisioningMode === TELEGRAM_PROVISIONING_MODE.customerProvidedBot ||
    provisioningMode === TELEGRAM_PROVISIONING_MODE.meetMattManagedBot
  ) {
    return provisioningMode;
  }

  return null;
}

function deriveProvisioningMode(
  metadata: Prisma.JsonValue | null,
  ownershipType?: string | null,
): TelegramProvisioningMode | null {
  const explicit = readProvisioningMode(metadata);
  if (explicit) {
    return explicit;
  }

  if (ownershipType === TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged) {
    return TELEGRAM_PROVISIONING_MODE.meetMattManagedBot;
  }

  if (ownershipType === TELEGRAM_IDENTITY_OWNERSHIP.customerOwned) {
    return TELEGRAM_PROVISIONING_MODE.customerProvidedBot;
  }

  return null;
}

function selectPrimaryLink(agent: AgentWithTelegramLinks) {
  return (
    agent.telegramIdentities.find((link) => link.role === "primary") ||
    agent.telegramIdentities[0] ||
    null
  );
}

function deriveLaunchState(agent: AgentWithTelegramLinks): AgentTelegramLaunchState {
  const primaryLink = selectPrimaryLink(agent);
  const identity = primaryLink?.telegramIdentity ?? null;
  const botUsername =
    identity?.externalTelegramUsername?.trim() ||
    agent.botUsername?.trim() ||
    null;
  const transportProvider =
    identity?.transportProvider || agent.transportProvider || null;

  return {
    primaryTelegramIdentityId: identity?.id ?? null,
    botAssigned: Boolean(identity),
    botOwnershipType: identity?.ownershipType ?? null,
    telegramProvisioningMode: deriveProvisioningMode(
      agent.metadata,
      identity?.ownershipType ?? null,
    ),
    botUsername,
    telegramLink: buildTelegramLink(botUsername) || agent.telegramLink || null,
    transportProvider,
    identityStatus: identity?.status ?? null,
    botToken:
      identity?.transportProvider === TRANSPORT_PROVIDER.telegramBotApi
        ? readStoredSecret(identity.botTokenEncrypted, {
            allowLegacyPlaintext: true,
          })
        : null,
  };
}

export async function getAgentTelegramLaunchState(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      telegramIdentities: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        include: {
          telegramIdentity: true,
        },
      },
    },
  });

  if (!agent) {
    return null;
  }

  return deriveLaunchState(agent);
}

export async function assignPrimaryTelegramIdentityToAgent(params: {
  agentId: string;
  telegramIdentityId: string;
  provisioningMode?: TelegramProvisioningMode | null;
  identityOwnershipType?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.$transaction(async (tx) => {
    const [agent, identity] = await Promise.all([
      tx.agent.findUnique({
        where: { id: params.agentId },
        include: {
          telegramIdentities: {
            orderBy: [{ role: "asc" }, { createdAt: "asc" }],
            include: {
              telegramIdentity: true,
            },
          },
        },
      }),
      tx.telegramIdentity.findUnique({
        where: { id: params.telegramIdentityId },
        include: {
          agentLinks: {
            include: {
              agent: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!agent) {
      throw { status: 404, message: "Agent not found" };
    }

    if (!identity) {
      throw { status: 404, message: "Telegram identity not found" };
    }

    if (identity.kind !== TELEGRAM_IDENTITY_KIND.bot) {
      throw {
        status: 400,
        message: "Only bot identities can be assigned as the primary Telegram bot",
      };
    }

    const conflictingLink = identity.agentLinks.find(
      (link) =>
        link.agentId !== agent.id &&
        link.role === "primary" &&
        link.agent.status !== "deleted",
    );
    if (conflictingLink) {
      throw {
        status: 409,
        message: `Telegram bot is already assigned to ${conflictingLink.agent.name}`,
      };
    }

    await tx.agentTelegramIdentity.updateMany({
      where: {
        agentId: agent.id,
        role: "primary",
        telegramIdentityId: {
          not: identity.id,
        },
      },
      data: {
        role: "secondary",
      },
    });

    await tx.agentTelegramIdentity.upsert({
      where: {
        agentId_telegramIdentityId: {
          agentId: agent.id,
          telegramIdentityId: identity.id,
        },
      },
      update: {
        role: "primary",
      },
      create: {
        agentId: agent.id,
        telegramIdentityId: identity.id,
        role: "primary",
      },
    });

    const ownershipType =
      params.identityOwnershipType?.trim() || identity.ownershipType;
    const provisioningMode =
      params.provisioningMode ||
      deriveProvisioningMode(agent.metadata, ownershipType) ||
      TELEGRAM_PROVISIONING_MODE.customerProvidedBot;
    const username = identity.externalTelegramUsername?.trim() || agent.botUsername?.trim() || null;

    await tx.telegramIdentity.update({
      where: { id: identity.id },
      data: {
        ownershipType:
          ownershipType === TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged
            ? TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged
            : TELEGRAM_IDENTITY_OWNERSHIP.customerOwned,
        user: agent.userId
          ? { connect: { id: agent.userId } }
          : undefined,
        workspace: agent.workspaceId
          ? { connect: { id: agent.workspaceId } }
          : undefined,
        displayName: identity.displayName || agent.name,
        status:
          identity.status === TELEGRAM_IDENTITY_STATUS.revoked
            ? TELEGRAM_IDENTITY_STATUS.revoked
            : identity.status === TELEGRAM_IDENTITY_STATUS.error
              ? TELEGRAM_IDENTITY_STATUS.error
              : TELEGRAM_IDENTITY_STATUS.active,
        metadata:
          params.metadata !== undefined
            ? mergeJson(identity.metadata, params.metadata)
            : identity.metadata ?? undefined,
      },
    });

    await tx.agent.update({
      where: { id: agent.id },
      data: {
        transportProvider: identity.transportProvider,
        botUsername: username,
        telegramLink: buildTelegramLink(username),
        telegramBotTokenEncrypted:
          identity.transportProvider === TRANSPORT_PROVIDER.telegramBotApi
            ? identity.botTokenEncrypted
            : agent.telegramBotTokenEncrypted,
        metadata: mergeAgentMetadata(agent.metadata, provisioningMode, {
          primaryTelegramIdentityId: identity.id,
          botOwnershipType: ownershipType,
          assignedAt: new Date().toISOString(),
        }),
      },
    });

    const updatedAgent = await tx.agent.findUniqueOrThrow({
      where: { id: agent.id },
      include: {
        telegramIdentities: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          include: {
            telegramIdentity: true,
          },
        },
      },
    });

    return {
      agent: updatedAgent,
      launchState: deriveLaunchState(updatedAgent),
    };
  });
}

export async function ensurePrimaryTelegramIdentityForAgent(agentId: string) {
  const existing = await getPrimaryTelegramIdentityForAgent(agentId);
  if (existing) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        telegramIdentities: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          include: {
            telegramIdentity: true,
          },
        },
      },
    });

    return agent ? deriveLaunchState(agent) : null;
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      telegramIdentities: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        include: {
          telegramIdentity: true,
        },
      },
    },
  });

  if (!agent) {
    return null;
  }

  const legacyToken = readStoredSecret(agent.telegramBotTokenEncrypted, {
    allowLegacyPlaintext: true,
  });

  if (!legacyToken) {
    return deriveLaunchState(agent);
  }

  const legacyBot = asRecord(agent.metadata).customerProvidedTelegramBot;
  const botMetadata =
    legacyBot && typeof legacyBot === "object" && !Array.isArray(legacyBot)
      ? (legacyBot as Record<string, unknown>)
      : {};
  const username =
    agent.botUsername?.trim() ||
    (typeof botMetadata.username === "string" ? botMetadata.username.trim() : "") ||
    null;

  const reusableIdentity =
    username
      ? await prisma.telegramIdentity.findFirst({
          where: {
            kind: TELEGRAM_IDENTITY_KIND.bot,
            transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
            ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.customerOwned,
            externalTelegramUsername: {
              equals: username,
              mode: "insensitive",
            },
          },
        })
      : null;

  const identity = reusableIdentity
    ? await updateTelegramIdentityCredentials({
        telegramIdentityId: reusableIdentity.id,
        transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
        ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.customerOwned,
        status: TELEGRAM_IDENTITY_STATUS.active,
        userId: agent.userId,
        workspaceId: agent.workspaceId,
        displayName: agent.name,
        externalTelegramUserId:
          typeof botMetadata.id === "string" ? botMetadata.id : undefined,
        externalTelegramUsername: username || undefined,
        botToken: legacyToken,
        metadata: {
          source: "legacy-agent-bot-backfill",
          migratedFromAgentId: agent.id,
        },
      })
    : await provisionTelegramIdentity({
        kind: TELEGRAM_IDENTITY_KIND.bot,
        transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
        ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.customerOwned,
        status: TELEGRAM_IDENTITY_STATUS.active,
        userId: agent.userId,
        workspaceId: agent.workspaceId,
        displayName: agent.name,
        externalTelegramUserId:
          typeof botMetadata.id === "string" ? botMetadata.id : null,
        externalTelegramUsername: username,
        botToken: legacyToken,
        metadata: {
          source: "legacy-agent-bot-backfill",
          migratedFromAgentId: agent.id,
        },
      });

  const assigned = await assignPrimaryTelegramIdentityToAgent({
    agentId: agent.id,
    telegramIdentityId: identity.id,
    provisioningMode: TELEGRAM_PROVISIONING_MODE.customerProvidedBot,
    identityOwnershipType: TELEGRAM_IDENTITY_OWNERSHIP.customerOwned,
    metadata: {
      source: "legacy-agent-bot-backfill",
      migratedFromAgentId: agent.id,
    },
  });

  return assigned.launchState;
}

export async function provisionCustomerProvidedTelegramBotForAgent(params: {
  agentId: string;
  userId: string;
  workspaceId: string | null;
  agentName: string;
  botId: string | null;
  botUsername: string | null;
  botFirstName: string | null;
  botToken: string;
}) {
  const normalizedUsername = params.botUsername?.trim() || null;
  const existingIdentity =
    normalizedUsername
      ? await prisma.telegramIdentity.findFirst({
          where: {
            kind: TELEGRAM_IDENTITY_KIND.bot,
            transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
            ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.customerOwned,
            externalTelegramUsername: {
              equals: normalizedUsername,
              mode: "insensitive",
            },
          },
          include: {
            agentLinks: {
              include: {
                agent: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
              },
            },
          },
        })
      : null;

  const conflictingLink = existingIdentity?.agentLinks.find(
    (link) =>
      link.agentId !== params.agentId &&
      link.role === "primary" &&
      link.agent.status !== "deleted",
  );
  if (conflictingLink) {
    throw {
      status: 409,
      message: `Telegram bot @${normalizedUsername} is already assigned to ${conflictingLink.agent.name}`,
    };
  }

  const identity = existingIdentity
    ? await updateTelegramIdentityCredentials({
        telegramIdentityId: existingIdentity.id,
        transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
        ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.customerOwned,
        status: TELEGRAM_IDENTITY_STATUS.active,
        userId: params.userId,
        workspaceId: params.workspaceId,
        displayName: params.botFirstName || params.agentName,
        externalTelegramUserId: params.botId || undefined,
        externalTelegramUsername: normalizedUsername || undefined,
        botToken: params.botToken,
        metadata: {
          source: "customer-provided-bot",
          botId: params.botId,
        },
      })
    : await provisionTelegramIdentity({
        kind: TELEGRAM_IDENTITY_KIND.bot,
        transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
        ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.customerOwned,
        status: TELEGRAM_IDENTITY_STATUS.active,
        userId: params.userId,
        workspaceId: params.workspaceId,
        displayName: params.botFirstName || params.agentName,
        externalTelegramUserId: params.botId,
        externalTelegramUsername: normalizedUsername,
        botToken: params.botToken,
        metadata: {
          source: "customer-provided-bot",
          botId: params.botId,
        },
      });

  return assignPrimaryTelegramIdentityToAgent({
    agentId: params.agentId,
    telegramIdentityId: identity.id,
    provisioningMode: TELEGRAM_PROVISIONING_MODE.customerProvidedBot,
    identityOwnershipType: TELEGRAM_IDENTITY_OWNERSHIP.customerOwned,
    metadata: {
      source: "customer-provided-bot",
      botId: params.botId,
      botUsername: normalizedUsername,
    },
  });
}
