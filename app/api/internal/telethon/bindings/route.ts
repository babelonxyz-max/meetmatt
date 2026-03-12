import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { upsertTelegramThreadBinding } from "@/lib/telegram-identities";

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const { searchParams } = new URL(req.url);
    const telegramIdentityId = searchParams.get("telegramIdentityId");
    const userId = searchParams.get("userId");
    const workspaceId = searchParams.get("workspaceId");
    const agentId = searchParams.get("agentId");
    const conversationThreadId = searchParams.get("conversationThreadId");
    const take = Math.min(
      Number.parseInt(searchParams.get("take") ?? "100", 10) || 100,
      250,
    );

    const bindings = await prisma.telegramThreadBinding.findMany({
      where: {
        telegramIdentityId: telegramIdentityId || undefined,
        userId: userId || undefined,
        workspaceId: workspaceId || undefined,
        agentId: agentId || undefined,
        conversationThreadId: conversationThreadId || undefined,
      },
      orderBy: [{ updatedAt: "desc" }],
      take,
      include: {
        telegramIdentity: {
          select: {
            id: true,
            displayName: true,
            kind: true,
            ownershipType: true,
            status: true,
            externalTelegramUserId: true,
            externalTelegramUsername: true,
          },
        },
        conversationThread: true,
        relationship: true,
      },
    });

    return NextResponse.json({ bindings });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Bindings] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const telegramIdentityId =
      typeof body.telegramIdentityId === "string"
        ? body.telegramIdentityId.trim()
        : "";
    const externalChatId =
      typeof body.externalChatId === "string" ? body.externalChatId.trim() : "";

    if (!telegramIdentityId || !externalChatId) {
      return NextResponse.json(
        { error: "telegramIdentityId and externalChatId are required" },
        { status: 400 },
      );
    }

    const binding = await upsertTelegramThreadBinding({
      telegramIdentityId,
      externalChatId,
      externalPeerId:
        typeof body.externalPeerId === "string" ? body.externalPeerId : null,
      userId: typeof body.userId === "string" ? body.userId : null,
      workspaceId:
        typeof body.workspaceId === "string" ? body.workspaceId : null,
      agentId: typeof body.agentId === "string" ? body.agentId : null,
      relationshipId:
        typeof body.relationshipId === "string" ? body.relationshipId : null,
      conversationThreadId:
        typeof body.conversationThreadId === "string"
          ? body.conversationThreadId
          : null,
      bindingType:
        typeof body.bindingType === "string" ? body.bindingType : null,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Prisma.InputJsonValue)
          : undefined,
      touchInbound: body.touchInbound === true,
      touchOutbound: body.touchOutbound === true,
    });

    return NextResponse.json({ binding });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Bindings] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
