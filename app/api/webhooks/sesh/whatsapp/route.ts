import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { safeCompare } from "@/lib/crypto-utils";
import { prisma } from "@/lib/prisma";
import { getStatusError } from "@/lib/http-error";
import { queueInboundRelationshipTask } from "@/lib/matt-relationships";
import { getWorkspaceSeshState } from "@/lib/sesh";
import {
  markWorkspaceWhatsAppInboundReceived,
  markWorkspaceWhatsAppWebhookFailure,
  normalizeWhatsAppWebhookMessages,
} from "@/lib/whatsapp";

function verifySeshSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(signature, expected);
}

async function resolveWorkspaceDefaultTarget(workspaceId: string) {
  const [workspace, sesh] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        ownerUserId: true,
        memberships: {
          where: {
            role: {
              in: ["owner", "admin"],
            },
          },
          orderBy: [{ createdAt: "asc" }],
          take: 1,
          select: {
            userId: true,
          },
        },
      },
    }),
    getWorkspaceSeshState(workspaceId),
  ]);

  if (!workspace) {
    throw { status: 404, message: "Workspace not found" };
  }

  const defaultUserId =
    sesh.whatsapp?.defaultUserId?.trim() ||
    workspace.ownerUserId ||
    workspace.memberships[0]?.userId ||
    null;

  if (!defaultUserId) {
    throw { status: 400, message: "Workspace has no default WhatsApp recipient user" };
  }

  return {
    userId: defaultUserId,
    role:
      sesh.whatsapp?.defaultRole === "account_manager"
        ? "account_manager"
        : "support",
  } as const;
}

export async function POST(request: NextRequest) {
  const workspaceId =
    new URL(request.url).searchParams.get("workspaceId")?.trim() || "";
  try {
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId query param required" }, { status: 400 });
    }

    const webhookSecret = process.env.MEETMATT_SESH_WEBHOOK_SECRET?.trim() || "";
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "MEETMATT_SESH_WEBHOOK_SECRET is not configured" },
        { status: 503 },
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-sesh-signature") || "";
    if (!verifySeshSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const eventName =
      typeof body.event === "string" ? body.event.trim() : "";
    if (!eventName.startsWith("integration.webhook.whatsapp")) {
      return NextResponse.json({ ok: true, ignored: true, reason: "not_whatsapp_event" });
    }

    const eventData =
      body.data && typeof body.data === "object" && !Array.isArray(body.data)
        ? (body.data as Record<string, unknown>)
        : {};
    const providerPayload =
      eventData.payload &&
      typeof eventData.payload === "object" &&
      !Array.isArray(eventData.payload)
        ? (eventData.payload as Record<string, unknown>)
        : {};

    const messages = normalizeWhatsAppWebhookMessages(providerPayload);
    if (messages.length === 0) {
      return NextResponse.json({ ok: true, ignored: true, reason: "no_messages" });
    }

    const target = await resolveWorkspaceDefaultTarget(workspaceId);
    const results = await Promise.all(
      messages.map((message) =>
        queueInboundRelationshipTask({
          userId: target.userId,
          workspaceId,
          externalThreadId: message.externalThreadId,
          externalUserId: message.externalUserId,
          messageId: message.messageId,
          receivedAt: message.receivedAt,
          text: message.text,
          title: message.contactName
            ? `WhatsApp: ${message.contactName}`
            : message.title,
          role: target.role,
          channel: "whatsapp",
        }),
      ),
    );
    const lastReceivedAt = messages.reduce<Date | null>((latest, message) => {
      if (!message.receivedAt) {
        return latest;
      }
      if (!latest || message.receivedAt.getTime() > latest.getTime()) {
        return message.receivedAt;
      }
      return latest;
    }, null);
    await markWorkspaceWhatsAppInboundReceived({
      workspaceId,
      receivedAt: lastReceivedAt,
    });

    return NextResponse.json({
      ok: true,
      workspaceId,
      received: messages.length,
      taskIds: results.map((result) => result.task.id),
      relationshipIds: results.map((result) => result.relationship.id),
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      if (workspaceId) {
        await markWorkspaceWhatsAppWebhookFailure({
          workspaceId,
          error: statusError.message,
        }).catch(() => {});
      }
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Webhooks/Sesh/WhatsApp] Error:", error);
    if (workspaceId) {
      await markWorkspaceWhatsAppWebhookFailure({
        workspaceId,
        error: error instanceof Error ? error.message : "Internal server error",
      }).catch(() => {});
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
