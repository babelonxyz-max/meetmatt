import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  TELEGRAM_BOT_PACK_ITEM_STATUS,
  TELEGRAM_BOT_PACK_STATUS,
  listTelegramBotPackSeatTemplates,
} from "@/lib/telegram-bot-inventory";

const telegramBotPackOpsInclude = {
  workspace: {
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
    },
  },
  items: {
    orderBy: [{ seatOrder: "asc" }],
    include: {
      telegramIdentity: {
        select: {
          id: true,
          displayName: true,
          externalTelegramUsername: true,
          ownershipType: true,
          status: true,
          runtimeLabel: true,
          updatedAt: true,
        },
      },
    },
  },
  transfers: {
    orderBy: [{ createdAt: "asc" }],
    include: {
      packItem: {
        select: {
          id: true,
          seatTemplateId: true,
          genericLabel: true,
          assignedSeatId: true,
          assignmentStatus: true,
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
      workspace: {
        select: {
          id: true,
          slug: true,
          name: true,
          kind: true,
        },
      },
    },
  },
} satisfies Prisma.TelegramBotPackInclude;

type TelegramBotPackOpsDetail = Prisma.TelegramBotPackGetPayload<{
  include: typeof telegramBotPackOpsInclude;
}>;

export async function getTelegramBotInventoryOpsData() {
  const seatTemplates = listTelegramBotPackSeatTemplates();

  const [packs, workspaces] = await Promise.all([
    prisma.telegramBotPack.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: telegramBotPackOpsInclude,
    }),
    prisma.workspace.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        slug: true,
        name: true,
        kind: true,
        ownerUserId: true,
        _count: {
          select: {
            agents: true,
            telegramIdentities: true,
          },
        },
      },
    }),
  ]);

  const packsWithMissingSeats = (packs as TelegramBotPackOpsDetail[]).map((pack) => {
    const assignedSeatIds = new Set(pack.items.map((item) => item.seatTemplateId));
    const missingSeatTemplates = seatTemplates.filter(
      (template) => !assignedSeatIds.has(template.id),
    );

    return {
      ...pack,
      missingSeatTemplates,
    };
  });

  const totalBots = packsWithMissingSeats.reduce(
    (sum, pack) => sum + pack.items.length,
    0,
  );
  const stockBots = packsWithMissingSeats.reduce(
    (sum, pack) =>
      sum +
      pack.items.filter(
        (item) => item.assignmentStatus === TELEGRAM_BOT_PACK_ITEM_STATUS.stock,
      ).length,
    0,
  );
  const activeBots = packsWithMissingSeats.reduce(
    (sum, pack) =>
      sum +
      pack.items.filter(
        (item) => item.assignmentStatus === TELEGRAM_BOT_PACK_ITEM_STATUS.active,
      ).length,
    0,
  );
  const transferPendingBots = packsWithMissingSeats.reduce(
    (sum, pack) =>
      sum +
      pack.items.filter(
        (item) =>
          item.assignmentStatus ===
          TELEGRAM_BOT_PACK_ITEM_STATUS.transferPending,
      ).length,
    0,
  );

  return {
    generatedAt: new Date(),
    seatTemplates,
    packs: packsWithMissingSeats,
    mutablePacks: packsWithMissingSeats.filter(
      (pack) =>
        pack.status === TELEGRAM_BOT_PACK_STATUS.draft ||
        pack.status === TELEGRAM_BOT_PACK_STATUS.ready,
    ),
    assignablePacks: packsWithMissingSeats.filter(
      (pack) =>
        pack.status === TELEGRAM_BOT_PACK_STATUS.ready ||
        pack.status === TELEGRAM_BOT_PACK_STATUS.assigned,
    ),
    transferablePacks: packsWithMissingSeats.filter(
      (pack) =>
        pack.status === TELEGRAM_BOT_PACK_STATUS.assigned ||
        pack.status === TELEGRAM_BOT_PACK_STATUS.transferPending,
    ),
    workspaces,
    metrics: {
      packCount: packsWithMissingSeats.length,
      readyPackCount: packsWithMissingSeats.filter(
        (pack) => pack.status === TELEGRAM_BOT_PACK_STATUS.ready,
      ).length,
      assignedPackCount: packsWithMissingSeats.filter(
        (pack) => pack.status === TELEGRAM_BOT_PACK_STATUS.assigned,
      ).length,
      transferredPackCount: packsWithMissingSeats.filter(
        (pack) => pack.status === TELEGRAM_BOT_PACK_STATUS.transferred,
      ).length,
      totalBots,
      stockBots,
      activeBots,
      transferPendingBots,
    },
  };
}
