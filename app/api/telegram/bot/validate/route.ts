import { NextRequest, NextResponse } from "next/server";
import { getStatusError } from "@/lib/http-error";
import { fetchTelegramBotProfile } from "@/lib/telegram-bot-api";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const telegramBotToken =
      typeof body.telegramBotToken === "string" ? body.telegramBotToken : "";

    if (!telegramBotToken.trim()) {
      return NextResponse.json(
        { error: "telegramBotToken required" },
        { status: 400 },
      );
    }

    const bot = await fetchTelegramBotProfile(telegramBotToken);
    return NextResponse.json({ bot });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json(
        { error: statusError.message },
        { status: statusError.status },
      );
    }

    console.error("[Telegram/Bot/Validate] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
