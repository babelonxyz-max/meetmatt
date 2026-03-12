import { NextRequest, NextResponse } from "next/server";
import { getStatusError } from "@/lib/http-error";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { retireTelegramBotPack } from "@/lib/telegram-bot-inventory";

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

    const pack = await retireTelegramBotPack({
      packId,
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

    console.error("[Internal/Telegram/Inventory/Packs/:packId/Retire] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
