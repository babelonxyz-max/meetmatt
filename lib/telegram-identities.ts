import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TRANSPORT_PROVIDER } from "@/lib/agent-blueprint";
import { ensurePersonalWorkspaceForUser } from "@/lib/workspaces";
import { encryptSecret, readStoredSecret } from "@/lib/secrets";

export const TELEGRAM_IDENTITY_KIND = {
  bot: "bot",
  userAgent: "user_agent",
} as const;

export const TELEGRAM_IDENTITY_OWNERSHIP = {
  customerOwned: "customer_owned",
  meetmattManaged: "meetmatt_managed",
} as const;

export const TELEGRAM_IDENTITY_STATUS = {
  pending: "pending",
  active: "active",
  suspended: "suspended",
  revoked: "revoked",
  error: "error",
} as const;

export const TELEGRAM_THREAD_BINDING_TYPE = {
  customerSupport: "customer_support",
  mattRelationship: "matt_relationship",
  customerEmployee: "customer_employee",
  internalOps: "internal_ops",
} as const;

export type TelegramIdentityKind =
  (typeof TELEGRAM_IDENTITY_KIND)[keyof typeof TELEGRAM_IDENTITY_KIND];
export type TelegramIdentityOwnershipType =
  (typeof TELEGRAM_IDENTITY_OWNERSHIP)[keyof typeof TELEGRAM_IDENTITY_OWNERSHIP];
export type TelegramIdentityStatus =
  (typeof TELEGRAM_IDENTITY_STATUS)[keyof typeof TELEGRAM_IDENTITY_STATUS];
export type TelegramThreadBindingType =
  (typeof TELEGRAM_THREAD_BINDING_TYPE)[keyof typeof TELEGRAM_THREAD_BINDING_TYPE];

function normalizeTransportProvider(
  value?: string | null,
  kind?: TelegramIdentityKind,
) {
  if (
    value === TRANSPORT_PROVIDER.telethon ||
    value === TRANSPORT_PROVIDER.telegramBotApi ||
    value === TRANSPORT_PROVIDER.web ||
    value === TRANSPORT_PROVIDER.none
  ) {
    return value;
  }

  return kind === TELEGRAM_IDENTITY_KIND.bot
    ? TRANSPORT_PROVIDER.telegramBotApi
    : TRANSPORT_PROVIDER.telethon;
}

function normalizeIdentityKind(value?: string | null): TelegramIdentityKind {
  return value === TELEGRAM_IDENTITY_KIND.bot
    ? TELEGRAM_IDENTITY_KIND.bot
    : TELEGRAM_IDENTITY_KIND.userAgent;
}

function normalizeOwnershipType(
  value?: string | null,
): TelegramIdentityOwnershipType {
  return value === TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged
    ? TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged
    : TELEGRAM_IDENTITY_OWNERSHIP.customerOwned;
}

function normalizeIdentityStatus(value?: string | null): TelegramIdentityStatus {
  return Object.values(TELEGRAM_IDENTITY_STATUS).includes(
    value as TelegramIdentityStatus,
  )
    ? (value as TelegramIdentityStatus)
    : TELEGRAM_IDENTITY_STATUS.pending;
}

export function normalizeThreadBindingType(
  value?: string | null,
): TelegramThreadBindingType {
  return Object.values(TELEGRAM_THREAD_BINDING_TYPE).includes(
    value as TelegramThreadBindingType,
  )
    ? (value as TelegramThreadBindingType)
    : TELEGRAM_THREAD_BINDING_TYPE.mattRelationship;
}

export async function listTelethonIdentities(params?: {
  status?: TelegramIdentityStatus | null;
  includeInactive?: boolean;
}) {
  const whereStatus = params?.includeInactive
    ? params?.status ?? undefined
    : params?.status ?? TELEGRAM_IDENTITY_STATUS.active;

  return prisma.telegramIdentity.findMany({
    where: {
      transportProvider: TRANSPORT_PROVIDER.telethon,
      status: whereStatus,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      agentLinks: {
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              slug: true,
              workspaceId: true,
              ownerType: true,
              agentKind: true,
              transportProvider: true,
              status: true,
              activationStatus: true,
              deployState: true,
              cortexId: true,
              userId: true,
            },
          },
        },
      },
      threadBindings: {
        where: { status: "active" },
        select: {
          id: true,
          externalChatId: true,
          externalPeerId: true,
          bindingType: true,
          status: true,
          userId: true,
          workspaceId: true,
          agentId: true,
          relationshipId: true,
          conversationThreadId: true,
          lastInboundAt: true,
          lastOutboundAt: true,
          metadata: true,
        },
      },
    },
  });
}

export async function provisionTelegramIdentity(params: {
  kind?: string | null;
  transportProvider?: string | null;
  ownershipType?: string | null;
  status?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
  displayName?: string | null;
  externalTelegramUserId?: string | null;
  externalTelegramUsername?: string | null;
  externalPhone?: string | null;
  botToken?: string | null;
  session?: string | null;
  runtimeLabel?: string | null;
  metadata?: Prisma.InputJsonValue;
  links?: Array<{ agentId: string; role?: string | null }>;
}) {
  const kind = normalizeIdentityKind(params.kind);
  const ownershipType = normalizeOwnershipType(params.ownershipType);
  const status = normalizeIdentityStatus(params.status);
  const transportProvider = normalizeTransportProvider(
    params.transportProvider,
    kind,
  );

  return prisma.$transaction(async (tx) => {
    let resolvedWorkspaceId = params.workspaceId?.trim() || null;

    if (!resolvedWorkspaceId && params.links && params.links.length > 0) {
      const linkedAgent = await tx.agent.findUnique({
        where: { id: params.links[0].agentId },
        select: { workspaceId: true },
      });
      resolvedWorkspaceId = linkedAgent?.workspaceId ?? null;
    }

    if (!resolvedWorkspaceId && params.userId) {
      resolvedWorkspaceId = (
        await ensurePersonalWorkspaceForUser(params.userId, tx)
      ).workspaceId;
    }

    const identity = await tx.telegramIdentity.create({
      data: {
        kind,
        ownershipType,
        status,
        transportProvider,
        userId: params.userId ?? null,
        workspaceId: resolvedWorkspaceId,
        displayName: params.displayName?.trim() || null,
        externalTelegramUserId: params.externalTelegramUserId?.trim() || null,
        externalTelegramUsername:
          params.externalTelegramUsername?.trim() || null,
        externalPhone: params.externalPhone?.trim() || null,
        botTokenEncrypted: encryptSecret(params.botToken),
        sessionEncrypted: encryptSecret(params.session),
        runtimeLabel: params.runtimeLabel?.trim() || null,
        metadata: params.metadata,
        lastHeartbeatAt:
          status === TELEGRAM_IDENTITY_STATUS.active ? new Date() : null,
      },
    });

    for (const link of params.links ?? []) {
      await tx.agentTelegramIdentity.upsert({
        where: {
          agentId_telegramIdentityId: {
            agentId: link.agentId,
            telegramIdentityId: identity.id,
          },
        },
        update: {
          role: link.role?.trim() || "primary",
        },
        create: {
          agentId: link.agentId,
          telegramIdentityId: identity.id,
          role: link.role?.trim() || "primary",
        },
      });

      await tx.agent.update({
        where: { id: link.agentId },
        data: {
          transportProvider,
          lastTransportHeartbeatAt:
            status === TELEGRAM_IDENTITY_STATUS.active ? new Date() : undefined,
        },
      });
    }

    return tx.telegramIdentity.findUniqueOrThrow({
      where: { id: identity.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        agentLinks: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                slug: true,
                ownerType: true,
                agentKind: true,
                transportProvider: true,
                status: true,
              },
            },
          },
        },
      },
    });
  });
}

export async function attachTelegramIdentityToAgent(params: {
  telegramIdentityId: string;
  agentId: string;
  role?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const identity = await tx.telegramIdentity.findUnique({
      where: { id: params.telegramIdentityId },
      select: {
        id: true,
        transportProvider: true,
      },
    });

    if (!identity) {
      throw { status: 404, message: "Telegram identity not found" };
    }

    const link = await tx.agentTelegramIdentity.upsert({
      where: {
        agentId_telegramIdentityId: {
          agentId: params.agentId,
          telegramIdentityId: params.telegramIdentityId,
        },
      },
      update: {
        role: params.role?.trim() || "primary",
      },
      create: {
        agentId: params.agentId,
        telegramIdentityId: params.telegramIdentityId,
        role: params.role?.trim() || "primary",
      },
      include: {
        agent: true,
        telegramIdentity: true,
      },
    });

    await tx.agent.update({
      where: { id: params.agentId },
      data: {
        transportProvider: identity.transportProvider,
      },
    });

    return link;
  });
}

export async function getPrimaryTelegramIdentityForAgent(agentId: string) {
  return prisma.agentTelegramIdentity.findFirst({
    where: { agentId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      telegramIdentity: true,
    },
  });
}

export async function upsertTelegramThreadBinding(params: {
  telegramIdentityId: string;
  externalChatId: string;
  externalPeerId?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
  agentId?: string | null;
  relationshipId?: string | null;
  conversationThreadId?: string | null;
  bindingType?: string | null;
  metadata?: Prisma.InputJsonValue;
  touchInbound?: boolean;
  touchOutbound?: boolean;
}) {
  const now = new Date();

  return prisma.telegramThreadBinding.upsert({
    where: {
      telegramIdentityId_externalChatId: {
        telegramIdentityId: params.telegramIdentityId,
        externalChatId: params.externalChatId,
      },
    },
    update: {
      externalPeerId: params.externalPeerId ?? undefined,
      userId: params.userId ?? undefined,
      workspaceId: params.workspaceId ?? undefined,
      agentId: params.agentId ?? undefined,
      relationshipId: params.relationshipId ?? undefined,
      conversationThreadId: params.conversationThreadId ?? undefined,
      bindingType: normalizeThreadBindingType(params.bindingType),
      status: "active",
      metadata: params.metadata,
      lastInboundAt: params.touchInbound ? now : undefined,
      lastOutboundAt: params.touchOutbound ? now : undefined,
    },
    create: {
      telegramIdentityId: params.telegramIdentityId,
      externalChatId: params.externalChatId,
      externalPeerId: params.externalPeerId ?? null,
      userId: params.userId ?? null,
      workspaceId: params.workspaceId ?? null,
      agentId: params.agentId ?? null,
      relationshipId: params.relationshipId ?? null,
      conversationThreadId: params.conversationThreadId ?? null,
      bindingType: normalizeThreadBindingType(params.bindingType),
      status: "active",
      metadata: params.metadata,
      lastInboundAt: params.touchInbound ? now : null,
      lastOutboundAt: params.touchOutbound ? now : null,
    },
    include: {
      telegramIdentity: true,
      conversationThread: true,
      relationship: true,
    },
  });
}

export async function resolveTelegramThreadBinding(params: {
  telegramIdentityId: string;
  externalChatId: string;
}) {
  return prisma.telegramThreadBinding.findUnique({
    where: {
      telegramIdentityId_externalChatId: {
        telegramIdentityId: params.telegramIdentityId,
        externalChatId: params.externalChatId,
      },
    },
    include: {
      telegramIdentity: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          ownerType: true,
          agentKind: true,
          transportProvider: true,
          status: true,
          cortexId: true,
        },
      },
      relationship: {
        include: {
          assignedAgent: {
            select: {
              id: true,
              name: true,
              ownerType: true,
              agentKind: true,
              transportProvider: true,
              status: true,
              cortexId: true,
            },
          },
        },
      },
      conversationThread: true,
    },
  });
}

export async function recordTelegramIdentityHeartbeat(params: {
  telegramIdentityId: string;
  connected: boolean;
  metadata?: Prisma.InputJsonValue;
  externalTelegramUserId?: string | null;
  externalTelegramUsername?: string | null;
  externalPhone?: string | null;
}) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const identity = await tx.telegramIdentity.update({
      where: { id: params.telegramIdentityId },
      data: {
        status: params.connected
          ? TELEGRAM_IDENTITY_STATUS.active
          : TELEGRAM_IDENTITY_STATUS.error,
        lastHeartbeatAt: now,
        lastSeenAt: params.connected ? now : undefined,
        externalTelegramUserId:
          params.externalTelegramUserId?.trim() || undefined,
        externalTelegramUsername:
          params.externalTelegramUsername?.trim() || undefined,
        externalPhone: params.externalPhone?.trim() || undefined,
        metadata: params.metadata,
      },
      include: {
        agentLinks: true,
      },
    });

    if (identity.agentLinks.length > 0) {
      await tx.agent.updateMany({
        where: {
          id: {
            in: identity.agentLinks.map((link) => link.agentId),
          },
        },
        data: {
          lastTransportHeartbeatAt: now,
        },
      });
    }

    return identity;
  });
}

export async function updateTelegramIdentityCredentials(params: {
  telegramIdentityId: string;
  transportProvider?: string | null;
  ownershipType?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
  displayName?: string | null;
  status?: string | null;
  externalTelegramUserId?: string | null;
  externalTelegramUsername?: string | null;
  externalPhone?: string | null;
  botToken?: string | null;
  session?: string | null;
  runtimeLabel?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const data: Prisma.TelegramIdentityUpdateInput = {};

  if (params.transportProvider !== undefined) {
    data.transportProvider = normalizeTransportProvider(params.transportProvider);
  }

  if (params.ownershipType !== undefined) {
    data.ownershipType = normalizeOwnershipType(params.ownershipType);
  }

  if (params.userId !== undefined) {
    data.user = params.userId
      ? { connect: { id: params.userId.trim() } }
      : { disconnect: true };
  }

  if (params.workspaceId !== undefined) {
    data.workspace = params.workspaceId
      ? { connect: { id: params.workspaceId.trim() } }
      : { disconnect: true };
  }

  if (params.displayName !== undefined) {
    data.displayName = params.displayName?.trim() || null;
  }

  if (params.status !== undefined) {
    data.status = normalizeIdentityStatus(params.status);
  }

  if (params.externalTelegramUserId !== undefined) {
    data.externalTelegramUserId =
      params.externalTelegramUserId?.trim() || null;
  }

  if (params.externalTelegramUsername !== undefined) {
    data.externalTelegramUsername =
      params.externalTelegramUsername?.trim() || null;
  }

  if (params.externalPhone !== undefined) {
    data.externalPhone = params.externalPhone?.trim() || null;
  }

  if (params.botToken !== undefined) {
    data.botTokenEncrypted = encryptSecret(params.botToken);
  }

  if (params.session !== undefined) {
    data.sessionEncrypted = encryptSecret(params.session);
  }

  if (params.runtimeLabel !== undefined) {
    data.runtimeLabel = params.runtimeLabel?.trim() || null;
  }

  if (params.metadata !== undefined) {
    data.metadata = params.metadata;
  }

  return prisma.telegramIdentity.update({
    where: { id: params.telegramIdentityId },
    data,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      agentLinks: {
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              slug: true,
              ownerType: true,
              agentKind: true,
              transportProvider: true,
              status: true,
            },
          },
        },
      },
      threadBindings: {
        where: { status: "active" },
        select: {
          id: true,
          externalChatId: true,
          externalPeerId: true,
          bindingType: true,
          status: true,
          userId: true,
          workspaceId: true,
          agentId: true,
          relationshipId: true,
          conversationThreadId: true,
          lastInboundAt: true,
          lastOutboundAt: true,
          metadata: true,
        },
      },
    },
  });
}

export function readTelegramIdentitySecrets(identity: {
  botTokenEncrypted?: string | null;
  sessionEncrypted?: string | null;
}) {
  return {
    botToken: readStoredSecret(identity.botTokenEncrypted, {
      allowLegacyPlaintext: true,
    }),
    session: readStoredSecret(identity.sessionEncrypted, {
      allowLegacyPlaintext: true,
    }),
  };
}
