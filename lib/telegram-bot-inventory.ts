import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TRANSPORT_PROVIDER } from "@/lib/agent-blueprint";
import {
  PLANCK_HQ_BOT_SEATS,
  PLANCK_HQ_BOT_SEAT_COUNT,
  buildAgentMetadata,
  buildTelegramLink,
  getPlanckHqBotSeat,
  upsertPlanckHqSeatAgent,
} from "@/lib/planck-hq-bot-fleet";
import {
  TELEGRAM_IDENTITY_KIND,
  TELEGRAM_IDENTITY_OWNERSHIP,
  TELEGRAM_IDENTITY_STATUS,
  attachTelegramIdentityToAgent,
  provisionTelegramIdentity,
  updateTelegramIdentityCredentials,
} from "@/lib/telegram-identities";

export const TELEGRAM_BOT_PACK_TEMPLATE = {
  planckHq17: "planck_hq_17",
} as const;

export const TELEGRAM_BOT_PACK_STATUS = {
  draft: "draft",
  ready: "ready",
  assigned: "assigned",
  transferPending: "transfer_pending",
  transferred: "transferred",
  retired: "retired",
} as const;

export const TELEGRAM_BOT_PACK_ITEM_STATUS = {
  stock: "stock",
  mapped: "mapped",
  active: "active",
  transferPending: "transfer_pending",
  transferred: "transferred",
  retired: "retired",
} as const;

export const TELEGRAM_BOT_TRANSFER_STATUS = {
  notStarted: "not_started",
  scheduled: "scheduled",
  inProgress: "in_progress",
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled",
} as const;

type PackTemplate =
  (typeof TELEGRAM_BOT_PACK_TEMPLATE)[keyof typeof TELEGRAM_BOT_PACK_TEMPLATE];
type PackStatus =
  (typeof TELEGRAM_BOT_PACK_STATUS)[keyof typeof TELEGRAM_BOT_PACK_STATUS];
type TransferStatus =
  (typeof TELEGRAM_BOT_TRANSFER_STATUS)[keyof typeof TELEGRAM_BOT_TRANSFER_STATUS];

export interface TelegramBotPackSeatTemplate {
  id: string;
  template: PackTemplate;
  seatId: string;
  title: string;
  displayOrder: number;
}

export interface TelegramBotPackCreateParams {
  slug?: string | null;
  template?: string | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface TelegramBotPackItemInput {
  telegramIdentityId?: string | null;
  seatTemplateId: string;
  genericLabel?: string | null;
  partnerFacingDisplayName?: string | null;
  partnerFacingUsername?: string | null;
  brandingStatus?: string | null;
  displayName?: string | null;
  externalTelegramUsername?: string | null;
  externalTelegramUserId?: string | null;
  externalPhone?: string | null;
  botToken?: string | null;
  session?: string | null;
  runtimeLabel?: string | null;
  status?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface TelegramBotPackImportParams {
  packId?: string | null;
  slug?: string | null;
  template?: string | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
  bots: TelegramBotPackItemInput[];
}

const PLANCK_HQ_PACK_SEAT_TEMPLATES: TelegramBotPackSeatTemplate[] =
  PLANCK_HQ_BOT_SEATS.map((seat, index) => ({
    id: seat.seatId,
    template: TELEGRAM_BOT_PACK_TEMPLATE.planckHq17,
    seatId: seat.seatId,
    title: seat.title,
    displayOrder: index + 1,
  }));

const PLANCK_HQ_PACK_SEAT_TEMPLATE_BY_ID = new Map(
  PLANCK_HQ_PACK_SEAT_TEMPLATES.map((template) => [template.id, template]),
);

const inventoryIdentityInclude = {
  agentLinks: true,
} satisfies Prisma.TelegramIdentityInclude;

const telegramBotPackListInclude = {
  workspace: {
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
    },
  },
  _count: {
    select: {
      items: true,
      transfers: true,
    },
  },
} satisfies Prisma.TelegramBotPackInclude;

const telegramBotPackDetailInclude = {
  workspace: {
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      ownerUserId: true,
    },
  },
  items: {
    orderBy: [{ seatOrder: "asc" }],
    include: {
      telegramIdentity: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          workspace: {
            select: {
              id: true,
              slug: true,
              name: true,
              kind: true,
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
                  status: true,
                  agentKind: true,
                  transportProvider: true,
                },
              },
            },
          },
        },
      },
    },
  },
  transfers: {
    orderBy: [{ createdAt: "asc" }],
    include: {
      workspace: {
        select: {
          id: true,
          slug: true,
          name: true,
          kind: true,
        },
      },
      telegramIdentity: {
        select: {
          id: true,
          displayName: true,
          externalTelegramUsername: true,
          ownershipType: true,
          status: true,
        },
      },
      packItem: {
        select: {
          id: true,
          seatTemplateId: true,
          genericLabel: true,
          assignedSeatId: true,
          assignmentStatus: true,
        },
      },
      initiatedByUser: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.TelegramBotPackInclude;

export type TelegramBotPackListEntry = Prisma.TelegramBotPackGetPayload<{
  include: typeof telegramBotPackListInclude;
}>;

export type TelegramBotPackDetail = Prisma.TelegramBotPackGetPayload<{
  include: typeof telegramBotPackDetailInclude;
}>;

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function defaultPackSlug(): string {
  return `planck-hq-pack-${Date.now().toString(36)}`;
}

function normalizePackTemplate(value?: string | null): PackTemplate {
  return value === TELEGRAM_BOT_PACK_TEMPLATE.planckHq17
    ? TELEGRAM_BOT_PACK_TEMPLATE.planckHq17
    : TELEGRAM_BOT_PACK_TEMPLATE.planckHq17;
}

function normalizeTelegramUsername(value?: string | null): string | null {
  const normalized = value?.trim().replace(/^@/, "").toLowerCase() || "";
  return normalized || null;
}

function normalizeIdentityStatus(value?: string | null): string {
  return value &&
    Object.values(TELEGRAM_IDENTITY_STATUS).includes(
      value as (typeof TELEGRAM_IDENTITY_STATUS)[keyof typeof TELEGRAM_IDENTITY_STATUS],
    )
    ? value
    : TELEGRAM_IDENTITY_STATUS.pending;
}

function normalizeTransferStatus(value?: string | null): TransferStatus {
  return value &&
    Object.values(TELEGRAM_BOT_TRANSFER_STATUS).includes(
      value as TransferStatus,
    )
    ? (value as TransferStatus)
    : TELEGRAM_BOT_TRANSFER_STATUS.notStarted;
}

function mergeJsonMetadata(
  base: unknown,
  patch: Record<string, unknown>,
): Prisma.InputJsonValue {
  const value =
    base && !Array.isArray(base) && typeof base === "object"
      ? { ...(base as Record<string, unknown>) }
      : {};

  return {
    ...value,
    ...patch,
  } as unknown as Prisma.InputJsonValue;
}

function isPackTransferred(detail: TelegramBotPackDetail): boolean {
  return detail.items.length === PLANCK_HQ_BOT_SEAT_COUNT &&
    detail.items.every(
      (item) =>
        item.assignmentStatus === TELEGRAM_BOT_PACK_ITEM_STATUS.transferred,
    ) &&
    detail.transfers.length === PLANCK_HQ_BOT_SEAT_COUNT &&
    detail.transfers.every(
      (transfer) =>
        transfer.transferStatus === TELEGRAM_BOT_TRANSFER_STATUS.completed,
    );
}

function hasTransferActivity(detail: TelegramBotPackDetail): boolean {
  return detail.transfers.length > 0 ||
    detail.items.some((item) =>
      item.assignmentStatus === TELEGRAM_BOT_PACK_ITEM_STATUS.transferPending ||
      item.assignmentStatus === TELEGRAM_BOT_PACK_ITEM_STATUS.transferred
    );
}

function hasAllSeatTemplates(detail: TelegramBotPackDetail): boolean {
  const requiredSeatTemplateIds = new Set(
    PLANCK_HQ_PACK_SEAT_TEMPLATES.map((template) => template.id),
  );

  if (detail.items.length !== requiredSeatTemplateIds.size) {
    return false;
  }

  for (const item of detail.items) {
    requiredSeatTemplateIds.delete(item.seatTemplateId);
  }

  return requiredSeatTemplateIds.size === 0;
}

async function getPackDetailOrThrow(packId: string): Promise<TelegramBotPackDetail> {
  const pack = await prisma.telegramBotPack.findUnique({
    where: { id: packId },
    include: telegramBotPackDetailInclude,
  });

  if (!pack) {
    throw { status: 404, message: "Telegram bot pack not found" };
  }

  return pack;
}

function getSeatTemplateOrThrow(seatTemplateId: string): TelegramBotPackSeatTemplate {
  const seatTemplate = PLANCK_HQ_PACK_SEAT_TEMPLATE_BY_ID.get(seatTemplateId);
  if (!seatTemplate) {
    throw { status: 400, message: `Unsupported seat template: ${seatTemplateId}` };
  }
  return seatTemplate;
}

async function syncPackLifecycle(packId: string): Promise<TelegramBotPackDetail> {
  const detail = await getPackDetailOrThrow(packId);

  if (detail.status === TELEGRAM_BOT_PACK_STATUS.retired) {
    return detail;
  }

  const nextStatus: PackStatus = isPackTransferred(detail)
    ? TELEGRAM_BOT_PACK_STATUS.transferred
    : hasTransferActivity(detail)
      ? TELEGRAM_BOT_PACK_STATUS.transferPending
      : detail.workspaceId && hasAllSeatTemplates(detail)
        ? TELEGRAM_BOT_PACK_STATUS.assigned
        : hasAllSeatTemplates(detail)
          ? TELEGRAM_BOT_PACK_STATUS.ready
          : TELEGRAM_BOT_PACK_STATUS.draft;

  const updateData: Prisma.TelegramBotPackUpdateInput = {};

  if (nextStatus !== detail.status) {
    updateData.status = nextStatus;
  }

  if (
    nextStatus === TELEGRAM_BOT_PACK_STATUS.assigned &&
    !detail.assignedAt
  ) {
    updateData.assignedAt = new Date();
  }

  if (
    nextStatus === TELEGRAM_BOT_PACK_STATUS.transferred &&
    !detail.transferredAt
  ) {
    updateData.transferredAt = new Date();
  }

  if (Object.keys(updateData).length === 0) {
    return detail;
  }

  await prisma.telegramBotPack.update({
    where: { id: packId },
    data: updateData,
  });

  return getPackDetailOrThrow(packId);
}

async function resolveInventoryIdentity(
  input: TelegramBotPackItemInput,
  context: {
    packId: string;
    seatTemplateId: string;
    genericLabel: string;
  },
) {
  const normalizedUsername = normalizeTelegramUsername(
    input.partnerFacingUsername || input.externalTelegramUsername,
  );
  const displayName = input.displayName?.trim() ||
    input.partnerFacingDisplayName?.trim() ||
    input.genericLabel?.trim() ||
    normalizedUsername ||
    context.genericLabel;
  const metadataPatch = {
    source: "telegram-bot-inventory",
    inventoryPackId: context.packId,
    seatTemplateId: context.seatTemplateId,
    genericLabel: context.genericLabel,
    stage: "stock",
  };
  const metadata = mergeJsonMetadata(input.metadata, metadataPatch);

  let identity:
    | Prisma.TelegramIdentityGetPayload<{
      include: typeof inventoryIdentityInclude;
    }>
    | null = null;

  if (input.telegramIdentityId?.trim()) {
    identity = await prisma.telegramIdentity.findUnique({
      where: { id: input.telegramIdentityId.trim() },
      include: inventoryIdentityInclude,
    });
  } else if (normalizedUsername) {
    identity = await prisma.telegramIdentity.findFirst({
      where: {
        externalTelegramUsername: {
          equals: normalizedUsername,
          mode: "insensitive",
        },
      },
      include: inventoryIdentityInclude,
    });
  }

  if (!identity) {
    return provisionTelegramIdentity({
      kind: TELEGRAM_IDENTITY_KIND.bot,
      transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
      ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged,
      status: normalizeIdentityStatus(input.status),
      displayName,
      externalTelegramUserId: input.externalTelegramUserId?.trim() || null,
      externalTelegramUsername: normalizedUsername,
      externalPhone: input.externalPhone?.trim() || null,
      botToken: input.botToken?.trim() || null,
      session: input.session?.trim() || null,
      runtimeLabel: input.runtimeLabel?.trim() || null,
      metadata,
    });
  }

  if (identity.agentLinks.length > 0) {
    throw {
      status: 400,
      message: `Telegram identity ${identity.id} is already linked to an agent`,
    };
  }

  return updateTelegramIdentityCredentials({
    telegramIdentityId: identity.id,
    transportProvider: TRANSPORT_PROVIDER.telegramBotApi,
    ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged,
    userId: null,
    workspaceId: null,
    displayName,
    status: normalizeIdentityStatus(input.status),
    externalTelegramUserId: input.externalTelegramUserId?.trim() || undefined,
    externalTelegramUsername: normalizedUsername || undefined,
    externalPhone: input.externalPhone?.trim() || undefined,
    botToken: input.botToken?.trim() || undefined,
    session: input.session?.trim() || undefined,
    runtimeLabel: input.runtimeLabel?.trim() || undefined,
    metadata: mergeJsonMetadata(identity.metadata, metadataPatch),
  });
}

async function ensurePackMutable(packId: string) {
  const pack = await prisma.telegramBotPack.findUnique({
    where: { id: packId },
    select: {
      id: true,
      status: true,
      template: true,
    },
  });

  if (!pack) {
    throw { status: 404, message: "Telegram bot pack not found" };
  }

  if (
    pack.status === TELEGRAM_BOT_PACK_STATUS.assigned ||
    pack.status === TELEGRAM_BOT_PACK_STATUS.transferPending ||
    pack.status === TELEGRAM_BOT_PACK_STATUS.transferred ||
    pack.status === TELEGRAM_BOT_PACK_STATUS.retired
  ) {
    throw {
      status: 400,
      message: `Pack ${pack.id} is not mutable in status ${pack.status}`,
    };
  }

  return pack;
}

async function resolveWorkspaceAssignmentContext(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      memberships: {
        orderBy: [{ createdAt: "asc" }],
        select: {
          userId: true,
          role: true,
        },
      },
    },
  });

  if (!workspace) {
    throw { status: 404, message: "Workspace not found" };
  }

  const primaryMembership =
    workspace.memberships.find((membership) => membership.role === "owner") ||
    workspace.memberships.find((membership) => membership.role === "admin") ||
    workspace.memberships[0];

  return {
    workspace,
    primaryUserId: workspace.ownerUserId || primaryMembership?.userId || null,
  };
}

export function listTelegramBotPackSeatTemplates(
  template: string = TELEGRAM_BOT_PACK_TEMPLATE.planckHq17,
) {
  if (normalizePackTemplate(template) !== TELEGRAM_BOT_PACK_TEMPLATE.planckHq17) {
    throw { status: 400, message: `Unsupported pack template: ${template}` };
  }

  return PLANCK_HQ_PACK_SEAT_TEMPLATES;
}

export async function listTelegramBotPacks(params?: {
  status?: string | null;
  template?: string | null;
  take?: number | null;
}) {
  const take = Math.min(Math.max(params?.take ?? 50, 1), 200);

  return prisma.telegramBotPack.findMany({
    where: {
      status:
        params?.status &&
        Object.values(TELEGRAM_BOT_PACK_STATUS).includes(params.status as PackStatus)
          ? (params.status as PackStatus)
          : undefined,
      template: normalizePackTemplate(params?.template),
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take,
    include: telegramBotPackListInclude,
  });
}

export async function createTelegramBotPack(
  params: TelegramBotPackCreateParams,
) {
  const rawSlug = params.slug?.trim() || defaultPackSlug();
  const slug = slugify(rawSlug);
  if (!slug) {
    throw { status: 400, message: "slug is required" };
  }

  return prisma.telegramBotPack.create({
    data: {
      slug,
      template: normalizePackTemplate(params.template),
      status: TELEGRAM_BOT_PACK_STATUS.draft,
      ownershipMode: TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged,
      notes: params.notes?.trim() || null,
      metadata: params.metadata,
    },
    include: telegramBotPackDetailInclude,
  });
}

export async function getTelegramBotPack(packId: string) {
  return getPackDetailOrThrow(packId);
}

export async function addTelegramBotPackItem(params: {
  packId: string;
  item: TelegramBotPackItemInput;
}) {
  const pack = await ensurePackMutable(params.packId);
  const seatTemplate = getSeatTemplateOrThrow(params.item.seatTemplateId);
  const genericLabel =
    params.item.genericLabel?.trim() ||
    params.item.displayName?.trim() ||
    params.item.partnerFacingDisplayName?.trim() ||
    seatTemplate.title;
  const identity = await resolveInventoryIdentity(params.item, {
    packId: pack.id,
    seatTemplateId: seatTemplate.id,
    genericLabel,
  });

  const existingPackItem = await prisma.telegramBotPackItem.findUnique({
    where: {
      packId_seatTemplateId: {
        packId: pack.id,
        seatTemplateId: seatTemplate.id,
      },
    },
  });

  if (
    existingPackItem &&
    existingPackItem.telegramIdentityId !== identity.id
  ) {
    await prisma.telegramBotPackItem.update({
      where: { id: existingPackItem.id },
      data: {
        telegramIdentityId: identity.id,
        genericLabel,
        partnerFacingDisplayName:
          params.item.partnerFacingDisplayName?.trim() || null,
        partnerFacingUsername:
          normalizeTelegramUsername(params.item.partnerFacingUsername) || null,
        brandingStatus: params.item.brandingStatus?.trim() || "pending",
        metadata: params.item.metadata,
      },
    });
  } else if (existingPackItem) {
    await prisma.telegramBotPackItem.update({
      where: { id: existingPackItem.id },
      data: {
        genericLabel,
        partnerFacingDisplayName:
          params.item.partnerFacingDisplayName?.trim() || null,
        partnerFacingUsername:
          normalizeTelegramUsername(params.item.partnerFacingUsername) || null,
        brandingStatus: params.item.brandingStatus?.trim() || "pending",
        metadata: params.item.metadata,
      },
    });
  } else {
    await prisma.telegramBotPackItem.create({
      data: {
        packId: pack.id,
        telegramIdentityId: identity.id,
        seatTemplateId: seatTemplate.id,
        seatOrder: seatTemplate.displayOrder,
        genericLabel,
        partnerFacingDisplayName:
          params.item.partnerFacingDisplayName?.trim() || null,
        partnerFacingUsername:
          normalizeTelegramUsername(params.item.partnerFacingUsername) || null,
        brandingStatus: params.item.brandingStatus?.trim() || "pending",
        assignmentStatus: TELEGRAM_BOT_PACK_ITEM_STATUS.stock,
        metadata: params.item.metadata,
      },
    });
  }

  return syncPackLifecycle(pack.id);
}

export async function importTelegramBotPack(
  params: TelegramBotPackImportParams,
) {
  const bots = Array.isArray(params.bots) ? params.bots : [];
  if (bots.length === 0) {
    throw { status: 400, message: "bots are required" };
  }

  const seatIds = new Set<string>();
  const usernames = new Set<string>();

  for (const bot of bots) {
    const seatTemplate = getSeatTemplateOrThrow(bot.seatTemplateId);
    if (seatIds.has(seatTemplate.id)) {
      throw {
        status: 400,
        message: `Duplicate seatTemplateId in import: ${seatTemplate.id}`,
      };
    }
    seatIds.add(seatTemplate.id);

    const normalizedUsername = normalizeTelegramUsername(
      bot.partnerFacingUsername || bot.externalTelegramUsername,
    );
    if (normalizedUsername) {
      if (usernames.has(normalizedUsername)) {
        throw {
          status: 400,
          message: `Duplicate externalTelegramUsername in import: ${normalizedUsername}`,
        };
      }
      usernames.add(normalizedUsername);
    }
  }

  let packId = params.packId?.trim() || null;
  if (!packId) {
    const createdPack = await createTelegramBotPack({
      slug: params.slug,
      template: params.template,
      notes: params.notes,
      metadata: params.metadata,
    });
    packId = createdPack.id;
  } else {
    await ensurePackMutable(packId);
  }

  for (const bot of bots) {
    await addTelegramBotPackItem({
      packId,
      item: bot,
    });
  }

  return getPackDetailOrThrow(packId);
}

export async function assignTelegramBotPackToWorkspace(params: {
  packId: string;
  workspaceId: string;
}) {
  const pack = await getPackDetailOrThrow(params.packId);
  if (pack.template !== TELEGRAM_BOT_PACK_TEMPLATE.planckHq17) {
    throw { status: 400, message: `Unsupported pack template: ${pack.template}` };
  }

  if (
    pack.status !== TELEGRAM_BOT_PACK_STATUS.ready &&
    pack.status !== TELEGRAM_BOT_PACK_STATUS.assigned
  ) {
    throw {
      status: 400,
      message: `Pack ${pack.id} is not assignable in status ${pack.status}`,
    };
  }

  if (pack.workspaceId && pack.workspaceId !== params.workspaceId) {
    throw {
      status: 400,
      message: `Pack ${pack.id} is already assigned to another workspace`,
    };
  }

  const { primaryUserId } = await resolveWorkspaceAssignmentContext(
    params.workspaceId,
  );

  for (const item of pack.items) {
    const seat = getPlanckHqBotSeat(item.seatTemplateId);
    if (!seat) {
      throw {
        status: 400,
        message: `Unknown seat template mapping: ${item.seatTemplateId}`,
      };
    }

    const username =
      normalizeTelegramUsername(item.partnerFacingUsername) ||
      normalizeTelegramUsername(item.telegramIdentity.externalTelegramUsername);
    const displayName =
      item.partnerFacingDisplayName?.trim() ||
      item.telegramIdentity.displayName?.trim() ||
      seat.displayName;
    const agentMetadata = mergeJsonMetadata(
      buildAgentMetadata(seat, primaryUserId, params.workspaceId),
      {
        source: "telegram-bot-inventory-assignment",
        inventoryPackId: pack.id,
        seatTemplateId: item.seatTemplateId,
        genericLabel: item.genericLabel,
      },
    );
    const { agent } = await upsertPlanckHqSeatAgent({
      seat,
      userId: primaryUserId,
      workspaceId: params.workspaceId,
      displayName,
      externalTelegramUsername: username,
      metadata: agentMetadata,
    });

    await prisma.agentTelegramIdentity.updateMany({
      where: {
        agentId: agent.id,
        telegramIdentityId: {
          not: item.telegramIdentityId,
        },
      },
      data: {
        role: "secondary",
      },
    });

    await attachTelegramIdentityToAgent({
      agentId: agent.id,
      telegramIdentityId: item.telegramIdentityId,
      role: "primary",
    });

    await updateTelegramIdentityCredentials({
      telegramIdentityId: item.telegramIdentityId,
      ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged,
      userId: primaryUserId,
      workspaceId: params.workspaceId,
      displayName,
      externalTelegramUsername: username || undefined,
      metadata: mergeJsonMetadata(item.telegramIdentity.metadata, {
        source: "telegram-bot-inventory-assignment",
        inventoryPackId: pack.id,
        seatTemplateId: item.seatTemplateId,
        assignedSeatId: seat.seatId,
        assignedWorkspaceId: params.workspaceId,
      }),
    });

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        botUsername: username || null,
        telegramLink: buildTelegramLink(username),
      },
    });

    await prisma.telegramBotPackItem.update({
      where: { id: item.id },
      data: {
        assignedSeatId: seat.seatId,
        assignmentStatus: TELEGRAM_BOT_PACK_ITEM_STATUS.active,
      },
    });
  }

  await prisma.telegramBotPack.update({
    where: { id: pack.id },
    data: {
      workspaceId: params.workspaceId,
      assignedAt: pack.assignedAt ?? new Date(),
    },
  });

  return syncPackLifecycle(pack.id);
}

export async function startTelegramBotPackTransfer(params: {
  packId: string;
  initiatedByUserId?: string | null;
  notes?: string | null;
}) {
  const pack = await getPackDetailOrThrow(params.packId);

  if (!pack.workspaceId) {
    throw { status: 400, message: "Pack must be assigned before transfer" };
  }

  if (
    pack.status !== TELEGRAM_BOT_PACK_STATUS.assigned &&
    pack.status !== TELEGRAM_BOT_PACK_STATUS.transferPending
  ) {
    throw {
      status: 400,
      message: `Pack ${pack.id} is not transferable in status ${pack.status}`,
    };
  }

  const now = new Date();

  for (const item of pack.items) {
    await prisma.telegramBotTransfer.upsert({
      where: { packItemId: item.id },
      update: {
        transferStatus:
          item.assignmentStatus === TELEGRAM_BOT_PACK_ITEM_STATUS.transferred
            ? TELEGRAM_BOT_TRANSFER_STATUS.completed
            : TELEGRAM_BOT_TRANSFER_STATUS.scheduled,
        initiatedAt: now,
        initiatedByUserId: params.initiatedByUserId?.trim() || null,
        notes: params.notes?.trim() || undefined,
      },
      create: {
        packId: pack.id,
        packItemId: item.id,
        telegramIdentityId: item.telegramIdentityId,
        workspaceId: pack.workspaceId,
        transferStatus:
          item.assignmentStatus === TELEGRAM_BOT_PACK_ITEM_STATUS.transferred
            ? TELEGRAM_BOT_TRANSFER_STATUS.completed
            : TELEGRAM_BOT_TRANSFER_STATUS.scheduled,
        initiatedAt: now,
        initiatedByUserId: params.initiatedByUserId?.trim() || null,
        notes: params.notes?.trim() || null,
      },
    });

    if (item.assignmentStatus !== TELEGRAM_BOT_PACK_ITEM_STATUS.transferred) {
      await prisma.telegramBotPackItem.update({
        where: { id: item.id },
        data: {
          assignmentStatus: TELEGRAM_BOT_PACK_ITEM_STATUS.transferPending,
        },
      });
    }
  }

  return syncPackLifecycle(pack.id);
}

export async function updateTelegramBotTransfer(params: {
  packId: string;
  transferId?: string | null;
  packItemId?: string | null;
  transferStatus: string;
  notes?: string | null;
}) {
  const transferStatus = normalizeTransferStatus(params.transferStatus);
  if (!params.transferId?.trim() && !params.packItemId?.trim()) {
    throw {
      status: 400,
      message: "transferId or packItemId is required",
    };
  }

  const transfer = params.transferId?.trim()
    ? await prisma.telegramBotTransfer.findUnique({
        where: { id: params.transferId.trim() },
      })
    : await prisma.telegramBotTransfer.findUnique({
        where: { packItemId: params.packItemId!.trim() },
      });

  if (!transfer || transfer.packId !== params.packId) {
    throw { status: 404, message: "Telegram bot transfer not found" };
  }

  const completedAt =
    transferStatus === TELEGRAM_BOT_TRANSFER_STATUS.completed
      ? new Date()
      : transfer.completedAt;

  await prisma.telegramBotTransfer.update({
    where: { id: transfer.id },
    data: {
      transferStatus,
      completedAt:
        transferStatus === TELEGRAM_BOT_TRANSFER_STATUS.completed
          ? completedAt
          : transferStatus === TELEGRAM_BOT_TRANSFER_STATUS.failed ||
              transferStatus === TELEGRAM_BOT_TRANSFER_STATUS.cancelled
            ? null
            : undefined,
      notes: params.notes?.trim() || undefined,
    },
  });

  if (transferStatus === TELEGRAM_BOT_TRANSFER_STATUS.completed) {
    await prisma.telegramBotPackItem.update({
      where: { id: transfer.packItemId },
      data: {
        assignmentStatus: TELEGRAM_BOT_PACK_ITEM_STATUS.transferred,
        transferredAt: completedAt,
      },
    });

    await updateTelegramIdentityCredentials({
      telegramIdentityId: transfer.telegramIdentityId,
      ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.customerOwned,
    });
  } else if (
    transferStatus === TELEGRAM_BOT_TRANSFER_STATUS.failed ||
    transferStatus === TELEGRAM_BOT_TRANSFER_STATUS.cancelled
  ) {
    await prisma.telegramBotPackItem.update({
      where: { id: transfer.packItemId },
      data: {
        assignmentStatus: TELEGRAM_BOT_PACK_ITEM_STATUS.active,
        transferredAt: null,
      },
    });

    await updateTelegramIdentityCredentials({
      telegramIdentityId: transfer.telegramIdentityId,
      ownershipType: TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged,
    });
  } else {
    await prisma.telegramBotPackItem.update({
      where: { id: transfer.packItemId },
      data: {
        assignmentStatus: TELEGRAM_BOT_PACK_ITEM_STATUS.transferPending,
      },
    });
  }

  return syncPackLifecycle(params.packId);
}

export async function retireTelegramBotPack(params: {
  packId: string;
  notes?: string | null;
}) {
  const pack = await getPackDetailOrThrow(params.packId);
  if (pack.status === TELEGRAM_BOT_PACK_STATUS.transferred) {
    throw {
      status: 400,
      message: `Pack ${pack.id} has already been transferred`,
    };
  }

  await prisma.telegramBotPack.update({
    where: { id: pack.id },
    data: {
      status: TELEGRAM_BOT_PACK_STATUS.retired,
      notes: params.notes?.trim() || pack.notes,
    },
  });

  await prisma.telegramBotPackItem.updateMany({
    where: {
      packId: pack.id,
      assignmentStatus: {
        not: TELEGRAM_BOT_PACK_ITEM_STATUS.transferred,
      },
    },
    data: {
      assignmentStatus: TELEGRAM_BOT_PACK_ITEM_STATUS.retired,
    },
  });

  return getPackDetailOrThrow(pack.id);
}
