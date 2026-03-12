import "dotenv/config";

import { readFile } from "node:fs/promises";
import { Prisma } from "@prisma/client";
import {
  assignTelegramBotPackToWorkspace,
  importTelegramBotPack,
  type TelegramBotPackImportParams,
} from "../lib/telegram-bot-inventory";

function readFlag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function printHelp() {
  console.log(
    "Usage: npm run import:telegram-bot-pack -- --file <path> [options]",
  );
  console.log("");
  console.log("Options:");
  console.log("  --packId <packId>               Import into an existing draft/ready pack");
  console.log("  --slug <slug>                   Create a new pack with this slug");
  console.log("  --template <template>           Pack template (default: planck_hq_17)");
  console.log("  --notes <text>                  Pack notes");
  console.log("  --workspaceId <workspaceId>     Assign the pack to a workspace after import");
  console.log("");
  console.log("Import JSON example:");
  console.log(
    JSON.stringify(
      {
        template: "planck_hq_17",
        slug: "planck-pack-001",
        notes: "Warm stock batch 1",
        bots: [
          {
            seatTemplateId: "seat.planck.hq.cro.george",
            displayName: "Stock Bot 01",
            externalTelegramUsername: "stockbot01",
            botToken: "123456:ABCDEF",
            runtimeLabel: "warm-pack-001-bot-01",
          },
        ],
      },
      null,
      2,
    ),
  );
}

async function loadImportPayload(pathname: string): Promise<TelegramBotPackImportParams> {
  const raw = await readFile(pathname, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Import JSON must be an object");
  }

  const payload = parsed as Record<string, unknown>;

  if (!Array.isArray(payload.bots)) {
    throw new Error("Import JSON must include a bots array");
  }

  return {
    packId: typeof payload.packId === "string" ? payload.packId : null,
    slug: typeof payload.slug === "string" ? payload.slug : null,
    template: typeof payload.template === "string" ? payload.template : null,
    notes: typeof payload.notes === "string" ? payload.notes : null,
    metadata:
      payload.metadata !== undefined
        ? (payload.metadata as Prisma.InputJsonValue)
        : undefined,
    bots: payload.bots as TelegramBotPackImportParams["bots"],
  };
}

async function main() {
  if (hasFlag("--help")) {
    printHelp();
    return;
  }

  const file = readFlag("--file");
  if (!file) {
    printHelp();
    throw new Error("--file is required");
  }

  const importPayload = await loadImportPayload(file);
  const pack = await importTelegramBotPack({
    ...importPayload,
    packId: readFlag("--packId") ?? importPayload.packId ?? null,
    slug: readFlag("--slug") ?? importPayload.slug ?? null,
    template: readFlag("--template") ?? importPayload.template ?? null,
    notes: readFlag("--notes") ?? importPayload.notes ?? null,
  });

  const workspaceId = readFlag("--workspaceId");
  const assignedPack = workspaceId
    ? await assignTelegramBotPackToWorkspace({
        packId: pack.id,
        workspaceId,
      })
    : null;

  const result = assignedPack ?? pack;

  console.log(
    JSON.stringify(
      {
        packId: result.id,
        slug: result.slug,
        status: result.status,
        template: result.template,
        workspaceId: result.workspaceId,
        totalItems: result.items.length,
        items: result.items.map((item) => ({
          seatTemplateId: item.seatTemplateId,
          assignedSeatId: item.assignedSeatId,
          telegramIdentityId: item.telegramIdentityId,
          externalTelegramUsername:
            item.telegramIdentity.externalTelegramUsername,
          assignmentStatus: item.assignmentStatus,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[import-telegram-bot-pack] Failed:", error);
  process.exit(1);
});
