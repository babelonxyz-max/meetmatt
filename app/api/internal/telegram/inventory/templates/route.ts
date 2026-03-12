import { NextRequest, NextResponse } from "next/server";
import { getStatusError } from "@/lib/http-error";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { listTelegramBotPackSeatTemplates } from "@/lib/telegram-bot-inventory";

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const { searchParams } = new URL(req.url);
    const templates = listTelegramBotPackSeatTemplates(
      searchParams.get("template") ?? undefined,
    );
    return NextResponse.json({ templates });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json(
        { error: statusError.message },
        { status: statusError.status },
      );
    }

    console.error("[Internal/Telegram/Inventory/Templates] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
