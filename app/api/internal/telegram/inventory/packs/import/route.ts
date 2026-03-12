import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getStatusError } from "@/lib/http-error";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import {
  TelegramBotPackItemInput,
  importTelegramBotPack,
} from "@/lib/telegram-bot-inventory";

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const bots = Array.isArray(body.bots)
      ? (body.bots as TelegramBotPackItemInput[])
      : [];

    const pack = await importTelegramBotPack({
      packId: typeof body.packId === "string" ? body.packId : null,
      slug: typeof body.slug === "string" ? body.slug : null,
      template: typeof body.template === "string" ? body.template : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      metadata:
        body.metadata !== undefined
          ? (body.metadata as Prisma.InputJsonValue)
          : undefined,
      bots,
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

    console.error("[Internal/Telegram/Inventory/Packs/Import] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
