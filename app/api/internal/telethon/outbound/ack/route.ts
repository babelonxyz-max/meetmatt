import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { acknowledgeOutboundTransportMessage } from "@/lib/transport-outbound";

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const messageId =
      typeof body.messageId === "string" ? body.messageId.trim() : "";
    const status =
      body.status === "sent" || body.status === "failed" || body.status === "canceled"
        ? body.status
        : null;

    if (!messageId || !status) {
      return NextResponse.json(
        { error: "messageId and status (sent|failed|canceled) are required" },
        { status: 400 },
      );
    }

    const message = await acknowledgeOutboundTransportMessage({
      messageId,
      status,
      responseExternalMessageId:
        typeof body.responseExternalMessageId === "string"
          ? body.responseExternalMessageId
          : null,
      errorCode: typeof body.errorCode === "string" ? body.errorCode : null,
      errorMessage:
        typeof body.errorMessage === "string" ? body.errorMessage : null,
      taskStatus:
        body.taskStatus === "running" ||
        body.taskStatus === "needs_approval" ||
        body.taskStatus === "completed" ||
        body.taskStatus === "failed" ||
        body.taskStatus === "canceled"
          ? body.taskStatus
          : null,
      ticketStatus:
        body.ticketStatus === "open" ||
        body.ticketStatus === "pending_user" ||
        body.ticketStatus === "escalated" ||
        body.ticketStatus === "resolved" ||
        body.ticketStatus === "closed"
          ? body.ticketStatus
          : null,
    });

    return NextResponse.json({ ok: true, message });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Outbound/Ack] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
