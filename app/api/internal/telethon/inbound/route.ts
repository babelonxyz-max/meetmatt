import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isInternalRequest } from "@/lib/internal-auth";
import { queueInboundRelationshipTask } from "@/lib/matt-relationships";
import { getStatusError } from "@/lib/http-error";
import { resolveTelegramThreadBinding } from "@/lib/telegram-identities";
import { ensurePersonalWorkspaceForUser, resolveWorkspaceAccessForUser } from "@/lib/workspaces";

async function resolveUserId(body: Record<string, unknown>): Promise<string | null> {
  if (typeof body.userId === "string" && body.userId.trim().length > 0) {
    return body.userId.trim();
  }

  if (typeof body.privyId === "string" && body.privyId.trim().length > 0) {
    const user = await prisma.user.findUnique({
      where: { privyId: body.privyId.trim() },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  if (typeof body.email === "string" && body.email.trim().length > 0) {
    const user = await prisma.user.findFirst({
      where: { email: body.email.trim() },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    if (!isInternalRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const telegramIdentityId =
      typeof body.telegramIdentityId === "string" &&
      body.telegramIdentityId.trim().length > 0
        ? body.telegramIdentityId.trim()
        : null;
    const externalThreadId = String(body.externalThreadId || "").trim();
    const text = String(body.text || "").trim();
    const channel =
      body.channel === "email" ||
      body.channel === "whatsapp" ||
      body.channel === "web" ||
      body.channel === "internal"
        ? body.channel
        : "telegram";

    if (!externalThreadId || !text) {
      return NextResponse.json(
        { error: "externalThreadId and text are required" },
        { status: 400 },
      );
    }

    const binding =
      telegramIdentityId && channel === "telegram"
        ? await resolveTelegramThreadBinding({
            telegramIdentityId,
            externalChatId: externalThreadId,
          })
        : null;

    const userId = binding?.userId ?? (await resolveUserId(body));
    if (!userId) {
      return NextResponse.json(
        {
          error:
            telegramIdentityId && channel === "telegram"
              ? "No Telegram thread binding found and no explicit userId, privyId, or email provided"
              : "userId, privyId, or email required",
        },
        { status: 400 },
      );
    }

    const explicitWorkspaceId =
      typeof body.workspaceId === "string" && body.workspaceId.trim().length > 0
        ? body.workspaceId.trim()
        : null;
    const workspaceId =
      binding?.workspaceId ||
      explicitWorkspaceId ||
      (
        await (
          explicitWorkspaceId
            ? resolveWorkspaceAccessForUser({
                userId,
                requestedWorkspaceId: explicitWorkspaceId,
              })
            : ensurePersonalWorkspaceForUser(userId)
        )
      ).workspaceId;

    const result = await queueInboundRelationshipTask({
      userId,
      workspaceId,
      externalThreadId,
      externalUserId:
        typeof body.externalUserId === "string" ? body.externalUserId : null,
      telegramIdentityId,
      messageId: typeof body.messageId === "string" ? body.messageId : null,
      receivedAt:
        typeof body.receivedAt === "string" && !Number.isNaN(Date.parse(body.receivedAt))
          ? new Date(body.receivedAt)
          : null,
      text,
      title: typeof body.title === "string" ? body.title : undefined,
      role:
        body.role === "account_manager"
          ? "account_manager"
          : binding?.relationship?.role === "account_manager"
            ? "account_manager"
            : "support",
      channel,
    });

    return NextResponse.json({
      ok: true,
      telegramIdentityId,
      bindingId: binding?.id ?? null,
      relationshipId: result.relationship.id,
      assignedAgentId: result.relationship.assignedAgentId,
      fleetId: result.fleet.id,
      threadId: result.thread.id,
      ticketId: result.ticket?.id ?? null,
      taskId: result.task.id,
      cortexId: result.relationship.assignedAgent.cortexId,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Inbound] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
