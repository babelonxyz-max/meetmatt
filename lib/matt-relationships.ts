import { prisma } from "@/lib/prisma";
import { UseCaseTemplateProvisioningMode } from "@prisma/client";
import {
  AGENT_KIND,
  BRAIN_PROVIDER,
  OWNER_TYPE,
  TRANSPORT_PROVIDER,
  defaultCortexIdForAgentKind,
} from "@/lib/agent-blueprint";
import {
  TELEGRAM_THREAD_BINDING_TYPE,
  upsertTelegramThreadBinding,
} from "@/lib/telegram-identities";
import { provisionAgentUseCaseBundle } from "@/lib/capability-commerce/provisioning";
import {
  USE_CASE_TEMPLATE_SLUG,
} from "@/lib/capability-commerce/registry";
import { ensurePersonalWorkspaceForUser, resolveWorkspaceAccessForUser } from "@/lib/workspaces";

type WorkspaceSummary = {
  id: string;
  name: string;
  kind: "personal" | "company";
};

type RelationshipRole = "account_manager" | "support";

function templateSlugForRelationshipRole(role: RelationshipRole): string {
  return role === "support"
    ? USE_CASE_TEMPLATE_SLUG.mattSupport
    : USE_CASE_TEMPLATE_SLUG.mattAccountManager;
}

type DbClient = Pick<
  typeof prisma,
  | "agent"
  | "conversationThread"
  | "customerRelationship"
  | "fleet"
  | "fleetMembership"
  | "fleetTask"
  | "supportTicket"
>;

const DEFAULT_FLEETS = {
  account_manager: {
    slug: "matt-account-management",
    name: "Matt Account Management",
    type: "internal_account_management",
    description: "Dedicated Matt account-manager assignments for customer accounts.",
  },
  support: {
    slug: "matt-support",
    name: "Matt Support",
    type: "internal_support",
    description: "Customer-facing support responders and ticket triage.",
  },
  internal_ops: {
    slug: "matt-internal-ops",
    name: "Matt Internal Ops",
    type: "internal_ops",
    description: "Backstage operations, escalations, and internal automations.",
  },
} as const;

function relationshipDisplayName(workspace: WorkspaceSummary): string {
  return workspace.name.trim() || `workspace-${workspace.id.slice(0, 6)}`;
}

function buildMattAgentSlug(workspaceId: string, role: RelationshipRole): string {
  return `matt-${role.replace("_", "-")}-${workspaceId.slice(0, 12)}`;
}

function buildConversationThreadKey(params: {
  channel: "telegram" | "whatsapp" | "email" | "web" | "internal";
  externalThreadId: string;
  telegramIdentityId?: string | null;
}) {
  if (params.channel === "telegram") {
    return params.telegramIdentityId
      ? `telegram:${params.telegramIdentityId}:${params.externalThreadId}`
      : `telegram:shared:${params.externalThreadId}`;
  }

  return `${params.channel}:${params.externalThreadId}`;
}

async function ensureFleet(
  db: DbClient,
  role: keyof typeof DEFAULT_FLEETS,
) {
  const config = DEFAULT_FLEETS[role];

  const existing = await db.fleet.findUnique({
    where: { slug: config.slug },
  });

  if (existing) {
    return existing;
  }

  return db.fleet.create({
    data: {
      slug: config.slug,
      name: config.name,
      description: config.description,
      type: config.type,
      ownerType: OWNER_TYPE.mattInternal,
      cortexId:
        role === "support"
          ? "matt-support"
          : role === "account_manager"
            ? "matt-account-manager"
            : "internal-ops",
    },
  });
}

async function ensureRelationshipAgent(
  db: DbClient,
  workspace: WorkspaceSummary,
  role: RelationshipRole,
) {
  const slug = buildMattAgentSlug(workspace.id, role);
  const existing = await db.agent.findUnique({
    where: { slug },
  });

  if (existing) {
    return existing;
  }

  const displayName = relationshipDisplayName(workspace);
  const isSupport = role === "support";
  const agentKind = isSupport
    ? AGENT_KIND.mattSupport
    : AGENT_KIND.mattAccountManager;
  const cortexId = defaultCortexIdForAgentKind(agentKind);

  return db.agent.create({
    data: {
      slug,
      sessionId: `matt_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: isSupport ? `Matt Support for ${displayName}` : `Matt for ${displayName}`,
      purpose: isSupport
        ? "Primary support contact for product, billing, and delivery issues."
        : "Dedicated account manager focused on onboarding, adoption, renewal, and proactive guidance.",
      tier: "matt-internal",
      ownerType: OWNER_TYPE.mattInternal,
      workspaceId: workspace.id,
      agentKind,
      productUseCase: "assistant",
      personalityPreset: isSupport ? "supportive" : "strategic",
      transportProvider: TRANSPORT_PROVIDER.telethon,
      brainProvider: BRAIN_PROVIDER.cortex,
      deploymentProvider: BRAIN_PROVIDER.openclaw,
      cortexId,
      status: "pending",
      activationStatus: "pending",
      deployState: "queued",
      metadata: {
        assignedWorkspaceId: workspace.id,
        role,
        displayName,
      },
    },
  });
}

async function ensureFleetMembership(
  db: DbClient,
  fleetId: string,
  agentId: string,
  role: string,
) {
  const existing = await db.fleetMembership.findFirst({
    where: { fleetId, agentId },
  });

  if (existing) {
    return existing;
  }

  return db.fleetMembership.create({
    data: {
      fleetId,
      agentId,
      role,
    },
  });
}

async function ensureRelationshipRecord(
  db: DbClient,
  workspaceId: string,
  userId: string,
  role: RelationshipRole,
  assignedAgentId: string,
) {
  const existing = await db.customerRelationship.findUnique({
    where: {
      workspaceId_userId_role: {
        workspaceId,
        userId,
        role,
      },
    },
    include: {
      assignedAgent: true,
    },
  });

  if (existing) {
    if (existing.assignedAgentId !== assignedAgentId) {
      return db.customerRelationship.update({
        where: { id: existing.id },
        data: { assignedAgentId },
        include: { assignedAgent: true },
      });
    }
    return existing;
  }

  return db.customerRelationship.create({
    data: {
      userId,
      workspaceId,
      role,
      assignedAgentId,
      primaryChannel: "telegram",
      slaTier: role === "support" ? "standard" : "relationship",
    },
    include: {
      assignedAgent: true,
    },
  });
}

export async function ensureMattRelationshipPack(params: {
  userId: string;
  workspaceId?: string | null;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  const workspaceAccess = params.workspaceId
    ? await resolveWorkspaceAccessForUser({
        userId: params.userId,
        requestedWorkspaceId: params.workspaceId,
      })
    : await ensurePersonalWorkspaceForUser(params.userId);

  const workspace = workspaceAccess.workspace;

  const seeded = await prisma.$transaction(async (db) => {
    const supportFleet = await ensureFleet(db, "support");
    const accountManagerFleet = await ensureFleet(db, "account_manager");

    const supportAgent = await ensureRelationshipAgent(db, workspace, "support");
    const accountManagerAgent = await ensureRelationshipAgent(
      db,
      workspace,
      "account_manager",
    );

    await ensureFleetMembership(db, supportFleet.id, supportAgent.id, "primary");
    await ensureFleetMembership(
      db,
      accountManagerFleet.id,
      accountManagerAgent.id,
      "primary",
    );

    const support = await ensureRelationshipRecord(
      db,
      workspace.id,
      user.id,
      "support",
      supportAgent.id,
    );
    const accountManager = await ensureRelationshipRecord(
      db,
      workspace.id,
      user.id,
      "account_manager",
      accountManagerAgent.id,
    );

    return {
      support,
      accountManager,
      workspace,
      fleets: {
        support: supportFleet,
        accountManager: accountManagerFleet,
      },
    };
  });

  await Promise.all([
    provisionAgentUseCaseBundle({
      agentId: seeded.support.assignedAgentId,
      useCaseTemplateSlug: templateSlugForRelationshipRole("support"),
      provisioningModes: [UseCaseTemplateProvisioningMode.grant_on_create],
    }).catch(() => undefined),
    provisionAgentUseCaseBundle({
      agentId: seeded.accountManager.assignedAgentId,
      useCaseTemplateSlug: templateSlugForRelationshipRole("account_manager"),
      provisioningModes: [UseCaseTemplateProvisioningMode.grant_on_create],
    }).catch(() => undefined),
  ]);

  return seeded;
}

export async function queueInboundRelationshipTask(params: {
  userId: string;
  workspaceId?: string | null;
  externalThreadId: string;
  externalUserId?: string | null;
  telegramIdentityId?: string | null;
  messageId?: string | null;
  receivedAt?: Date | null;
  text: string;
  title?: string;
  role?: RelationshipRole;
  channel?: "telegram" | "whatsapp" | "email" | "web" | "internal";
}) {
  const normalizedRole: RelationshipRole = params.role ?? "support";
  const channel = params.channel ?? "telegram";
  const threadKey = buildConversationThreadKey({
    channel,
    externalThreadId: params.externalThreadId,
    telegramIdentityId: params.telegramIdentityId,
  });
  const workspaceAccess = params.workspaceId
    ? await resolveWorkspaceAccessForUser({
        userId: params.userId,
        requestedWorkspaceId: params.workspaceId,
      })
    : await ensurePersonalWorkspaceForUser(params.userId);
  const seeded = await ensureMattRelationshipPack({
    userId: params.userId,
    workspaceId: workspaceAccess.workspaceId,
  });
  const relationship =
    normalizedRole === "account_manager"
      ? seeded.accountManager
      : seeded.support;
  const fleet =
    normalizedRole === "account_manager"
      ? seeded.fleets.accountManager
      : seeded.fleets.support;

  const result = await prisma.$transaction(async (db) => {
    const thread = await db.conversationThread.upsert({
      where: {
        threadKey,
      },
      update: {
        userId: params.userId,
        workspaceId: workspaceAccess.workspaceId,
        relationshipId: relationship.id,
        externalUserId: params.externalUserId ?? undefined,
        lastInboundAt: new Date(),
        lastMessageAt: new Date(),
      },
      create: {
        userId: params.userId,
        workspaceId: workspaceAccess.workspaceId,
        relationshipId: relationship.id,
        channel,
        threadKey,
        externalThreadId: params.externalThreadId,
        externalUserId: params.externalUserId ?? undefined,
        title: params.title || params.text.slice(0, 80),
        lastInboundAt: new Date(),
        lastMessageAt: new Date(),
      },
    });

    const ticket =
      normalizedRole === "support"
        ? await db.supportTicket.findFirst({
            where: {
              conversationThreadId: thread.id,
              status: {
                in: ["open", "pending_user", "escalated"],
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : null;

    const supportTicket =
      ticket ||
      (normalizedRole === "support"
        ? await db.supportTicket.create({
            data: {
              userId: params.userId,
              workspaceId: workspaceAccess.workspaceId,
              relationshipId: relationship.id,
              conversationThreadId: thread.id,
              assignedAgentId: relationship.assignedAgentId,
              subject: params.title || params.text.slice(0, 120),
              summary: params.text.slice(0, 500),
              sourceChannel: channel,
              priority: "normal",
            },
          })
        : null);

    const task = await db.fleetTask.create({
      data: {
        fleetId: fleet.id,
        assignedAgentId: relationship.assignedAgentId,
        requesterUserId: params.userId,
        ticketId: supportTicket?.id,
        conversationThreadId: thread.id,
        type:
          normalizedRole === "support"
            ? "support.inbound_message"
            : "relationship.inbound_message",
        status: "queued",
        priority: normalizedRole === "support" ? "high" : "normal",
        title: params.title || params.text.slice(0, 120),
        payload: {
          channel,
          message: params.text,
          externalThreadId: params.externalThreadId,
          externalUserId: params.externalUserId ?? null,
          telegramIdentityId: params.telegramIdentityId ?? null,
          messageId: params.messageId ?? null,
          receivedAt: params.receivedAt?.toISOString() ?? null,
        },
      },
      include: {
        assignedAgent: true,
        ticket: true,
        fleet: true,
      },
    });

    return {
      relationship,
      fleet,
      thread,
      ticket: supportTicket,
      task,
    };
  });

  if (params.telegramIdentityId && channel === "telegram") {
    await upsertTelegramThreadBinding({
      telegramIdentityId: params.telegramIdentityId,
      externalChatId: params.externalThreadId,
      externalPeerId: params.externalUserId ?? null,
      userId: params.userId,
      workspaceId: workspaceAccess.workspaceId,
      agentId: result.relationship.assignedAgentId,
      relationshipId: result.relationship.id,
      conversationThreadId: result.thread.id,
      bindingType:
        normalizedRole === "support"
          ? TELEGRAM_THREAD_BINDING_TYPE.customerSupport
          : TELEGRAM_THREAD_BINDING_TYPE.mattRelationship,
      metadata: {
        role: normalizedRole,
        source: "queueInboundRelationshipTask",
      },
      touchInbound: true,
    });
  }

  return result;
}
