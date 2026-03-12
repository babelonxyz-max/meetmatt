"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getErrorMessage } from "@/lib/http-error";
import { requireOpsSession } from "@/lib/ops-auth";
import {
  addTelegramBotPackItem,
  assignTelegramBotPackToWorkspace,
  createTelegramBotPack,
  importTelegramBotPack,
  retireTelegramBotPack,
  startTelegramBotPackTransfer,
  updateTelegramBotTransfer,
} from "@/lib/telegram-bot-inventory";

function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function inventoryRedirectUrl(params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value.length > 0) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query
    ? `/ops/telegram-inventory?${query}`
    : "/ops/telegram-inventory";
}

function refreshInventory() {
  revalidatePath("/ops");
  revalidatePath("/ops/telegram-inventory");
}

export async function createTelegramBotPackAction(formData: FormData) {
  await requireOpsSession("/ops/telegram-inventory");
  const slug = getStringValue(formData, "slug");
  const notes = getStringValue(formData, "notes");

  try {
    const pack = await createTelegramBotPack({
      slug: slug || null,
      notes: notes || null,
      metadata: {
        source: "ops-console",
      },
    });

    refreshInventory();
    redirect(
      inventoryRedirectUrl({
        notice: "pack-created",
        packId: pack.id,
      }),
    );
  } catch (error) {
    console.error("[Ops/Telegram Inventory] Failed to create pack:", error);
    redirect(
      inventoryRedirectUrl({
        error: "pack-create-failed",
        message: getErrorMessage(error, "Failed to create draft pack"),
      }),
    );
  }
}

export async function importTelegramBotPackAction(formData: FormData) {
  await requireOpsSession("/ops/telegram-inventory");
  const payload = getStringValue(formData, "payload");
  const workspaceId = getStringValue(formData, "workspaceId");

  if (!payload) {
    redirect(
      inventoryRedirectUrl({
        error: "import-payload-required",
      }),
    );
  }

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const pack = await importTelegramBotPack({
      packId: typeof parsed.packId === "string" ? parsed.packId : null,
      slug: typeof parsed.slug === "string" ? parsed.slug : null,
      template: typeof parsed.template === "string" ? parsed.template : null,
      notes: typeof parsed.notes === "string" ? parsed.notes : null,
      metadata:
        parsed.metadata !== undefined
          ? (parsed.metadata as Prisma.InputJsonValue)
          : undefined,
      bots: Array.isArray(parsed.bots)
        ? (parsed.bots as Parameters<typeof importTelegramBotPack>[0]["bots"])
        : [],
    });

    if (workspaceId) {
      await assignTelegramBotPackToWorkspace({
        packId: pack.id,
        workspaceId,
      });
    }

    refreshInventory();
    redirect(
      inventoryRedirectUrl({
        notice: workspaceId ? "pack-imported-and-assigned" : "pack-imported",
        packId: pack.id,
      }),
    );
  } catch (error) {
    console.error("[Ops/Telegram Inventory] Failed to import pack:", error);
    redirect(
      inventoryRedirectUrl({
        error: "pack-import-failed",
        message: getErrorMessage(error, "Failed to import Telegram bot pack"),
      }),
    );
  }
}

export async function addTelegramBotPackItemAction(formData: FormData) {
  await requireOpsSession("/ops/telegram-inventory");
  const packId = getStringValue(formData, "packId");
  const seatTemplateId = getStringValue(formData, "seatTemplateId");

  if (!packId || !seatTemplateId) {
    redirect(
      inventoryRedirectUrl({
        error: "pack-item-required",
      }),
    );
  }

  try {
    await addTelegramBotPackItem({
      packId,
      item: {
        seatTemplateId,
        genericLabel: getStringValue(formData, "genericLabel") || null,
        displayName: getStringValue(formData, "displayName") || null,
        externalTelegramUsername:
          getStringValue(formData, "externalTelegramUsername") || null,
        botToken: getStringValue(formData, "botToken") || null,
        runtimeLabel: getStringValue(formData, "runtimeLabel") || null,
        status: getStringValue(formData, "status") || null,
        metadata: {
          source: "ops-console",
          entryMode: "manual",
        },
      },
    });

    refreshInventory();
    redirect(
      inventoryRedirectUrl({
        notice: "pack-item-added",
        packId,
      }),
    );
  } catch (error) {
    console.error("[Ops/Telegram Inventory] Failed to add pack item:", error);
    redirect(
      inventoryRedirectUrl({
        error: "pack-item-failed",
        message: getErrorMessage(error, "Failed to add bot to pack"),
        packId,
      }),
    );
  }
}

export async function assignTelegramBotPackAction(formData: FormData) {
  await requireOpsSession("/ops/telegram-inventory");
  const packId = getStringValue(formData, "packId");
  const workspaceId = getStringValue(formData, "workspaceId");

  if (!packId || !workspaceId) {
    redirect(
      inventoryRedirectUrl({
        error: "pack-assign-required",
      }),
    );
  }

  try {
    await assignTelegramBotPackToWorkspace({
      packId,
      workspaceId,
    });

    refreshInventory();
    redirect(
      inventoryRedirectUrl({
        notice: "pack-assigned",
        packId,
      }),
    );
  } catch (error) {
    console.error("[Ops/Telegram Inventory] Failed to assign pack:", error);
    redirect(
      inventoryRedirectUrl({
        error: "pack-assign-failed",
        message: getErrorMessage(error, "Failed to assign pack"),
        packId,
      }),
    );
  }
}

export async function startTelegramBotPackTransferAction(formData: FormData) {
  await requireOpsSession("/ops/telegram-inventory");
  const packId = getStringValue(formData, "packId");
  const notes = getStringValue(formData, "notes");

  if (!packId) {
    redirect(
      inventoryRedirectUrl({
        error: "pack-transfer-required",
      }),
    );
  }

  try {
    await startTelegramBotPackTransfer({
      packId,
      notes: notes || null,
    });

    refreshInventory();
    redirect(
      inventoryRedirectUrl({
        notice: "pack-transfer-started",
        packId,
      }),
    );
  } catch (error) {
    console.error("[Ops/Telegram Inventory] Failed to start transfer:", error);
    redirect(
      inventoryRedirectUrl({
        error: "pack-transfer-failed",
        message: getErrorMessage(error, "Failed to start transfer"),
        packId,
      }),
    );
  }
}

export async function updateTelegramBotTransferAction(formData: FormData) {
  await requireOpsSession("/ops/telegram-inventory");
  const packId = getStringValue(formData, "packId");
  const transferId = getStringValue(formData, "transferId");
  const packItemId = getStringValue(formData, "packItemId");
  const transferStatus = getStringValue(formData, "transferStatus");
  const notes = getStringValue(formData, "notes");

  if (!packId || !transferStatus || (!transferId && !packItemId)) {
    redirect(
      inventoryRedirectUrl({
        error: "transfer-update-required",
      }),
    );
  }

  try {
    await updateTelegramBotTransfer({
      packId,
      transferId: transferId || null,
      packItemId: packItemId || null,
      transferStatus,
      notes: notes || null,
    });

    refreshInventory();
    redirect(
      inventoryRedirectUrl({
        notice: "transfer-updated",
        packId,
      }),
    );
  } catch (error) {
    console.error("[Ops/Telegram Inventory] Failed to update transfer:", error);
    redirect(
      inventoryRedirectUrl({
        error: "transfer-update-failed",
        message: getErrorMessage(error, "Failed to update transfer"),
        packId,
      }),
    );
  }
}

export async function retireTelegramBotPackAction(formData: FormData) {
  await requireOpsSession("/ops/telegram-inventory");
  const packId = getStringValue(formData, "packId");
  const notes = getStringValue(formData, "notes");

  if (!packId) {
    redirect(
      inventoryRedirectUrl({
        error: "pack-retire-required",
      }),
    );
  }

  try {
    await retireTelegramBotPack({
      packId,
      notes: notes || null,
    });

    refreshInventory();
    redirect(
      inventoryRedirectUrl({
        notice: "pack-retired",
        packId,
      }),
    );
  } catch (error) {
    console.error("[Ops/Telegram Inventory] Failed to retire pack:", error);
    redirect(
      inventoryRedirectUrl({
        error: "pack-retire-failed",
        message: getErrorMessage(error, "Failed to retire pack"),
        packId,
      }),
    );
  }
}
