import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getStatusError } from "@/lib/http-error";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import {
  createTelegramBotPack,
  listTelegramBotPacks,
} from "@/lib/telegram-bot-inventory";

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const { searchParams } = new URL(req.url);
    const take = Math.min(
      Number.parseInt(searchParams.get("take") ?? "50", 10) || 50,
      200,
    );
    const packs = await listTelegramBotPacks({
      status: searchParams.get("status"),
      template: searchParams.get("template"),
      take,
    });

    return NextResponse.json({ packs });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json(
        { error: statusError.message },
        { status: statusError.status },
      );
    }

    console.error("[Internal/Telegram/Inventory/Packs] GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;

    const pack = await createTelegramBotPack({
      slug: typeof body.slug === "string" ? body.slug : null,
      template: typeof body.template === "string" ? body.template : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      metadata:
        body.metadata !== undefined
          ? (body.metadata as Prisma.InputJsonValue)
          : undefined,
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

    console.error("[Internal/Telegram/Inventory/Packs] POST Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
