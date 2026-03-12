import { NextRequest, NextResponse } from "next/server";
import { getStatusError } from "@/lib/http-error";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import {
  startTelegramBotPackTransfer,
  updateTelegramBotTransfer,
} from "@/lib/telegram-bot-inventory";

type RouteContext = {
  params: Promise<{
    packId: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    requireAdminOrInternal(req);
    const { packId } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;

    const pack = await startTelegramBotPackTransfer({
      packId,
      initiatedByUserId:
        typeof body.initiatedByUserId === "string"
          ? body.initiatedByUserId
          : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    return NextResponse.json({ pack });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json(
        { error: statusError.message },
        { status: statusError.status },
      );
    }

    console.error("[Internal/Telegram/Inventory/Packs/:packId/Transfer] POST Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    requireAdminOrInternal(req);
    const { packId } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const transferStatus =
      typeof body.transferStatus === "string" ? body.transferStatus.trim() : "";

    if (!transferStatus) {
      return NextResponse.json(
        { error: "transferStatus is required" },
        { status: 400 },
      );
    }

    const pack = await updateTelegramBotTransfer({
      packId,
      transferId:
        typeof body.transferId === "string" ? body.transferId.trim() : null,
      packItemId:
        typeof body.packItemId === "string" ? body.packItemId.trim() : null,
      transferStatus,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    return NextResponse.json({ pack });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json(
        { error: statusError.message },
        { status: statusError.status },
      );
    }

    console.error("[Internal/Telegram/Inventory/Packs/:packId/Transfer] PATCH Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
