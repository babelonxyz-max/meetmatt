import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { recordTelegramIdentityHeartbeat } from "@/lib/telegram-identities";

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const telegramIdentityId =
      typeof body.telegramIdentityId === "string"
        ? body.telegramIdentityId.trim()
        : "";

    if (!telegramIdentityId) {
      return NextResponse.json(
        { error: "telegramIdentityId is required" },
        { status: 400 },
      );
    }

    const connected = body.connected !== false;

    const identity = await recordTelegramIdentityHeartbeat({
      telegramIdentityId,
      connected,
      externalTelegramUserId:
        typeof body.externalTelegramUserId === "string"
          ? body.externalTelegramUserId
          : null,
      externalTelegramUsername:
        typeof body.externalTelegramUsername === "string"
          ? body.externalTelegramUsername
          : null,
      externalPhone:
        typeof body.externalPhone === "string" ? body.externalPhone : null,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Prisma.InputJsonValue)
          : {
              runner: typeof body.runner === "string" ? body.runner : null,
              authorized: body.authorized === true,
            } satisfies Prisma.InputJsonObject,
    });

    return NextResponse.json({ ok: true, identity });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Heartbeat] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
