import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import {
  claimOutboundTransportMessages,
  enqueueOutboundReplyForTask,
  enqueueOutboundTransportMessage,
  OUTBOUND_TRANSPORT_MESSAGE_TYPE,
} from "@/lib/transport-outbound";

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20,
      100,
    );
    const claimedBy = searchParams.get("claimedBy");
    const telegramIdentityId = searchParams.get("telegramIdentityId");

    const messages = await claimOutboundTransportMessages({
      limit,
      claimedBy,
      telegramIdentityId,
    });

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Outbound] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;

    if (
      typeof body.taskId === "string" &&
      body.taskId.trim().length > 0 &&
      typeof body.responseText === "string" &&
      body.responseText.trim().length > 0
    ) {
      const message = await enqueueOutboundReplyForTask({
        taskId: body.taskId.trim(),
        responseText: body.responseText.trim(),
        telegramIdentityId:
          typeof body.telegramIdentityId === "string"
            ? body.telegramIdentityId.trim()
            : null,
        externalMessageId:
          typeof body.externalMessageId === "string"
            ? body.externalMessageId.trim()
            : null,
      });

      return NextResponse.json({ message });
    }

    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
    const telegramIdentityId =
      typeof body.telegramIdentityId === "string"
        ? body.telegramIdentityId.trim()
        : "";
    const externalChatId =
      typeof body.externalChatId === "string" ? body.externalChatId.trim() : "";

    if (!agentId || !telegramIdentityId || !externalChatId) {
      return NextResponse.json(
        {
          error:
            "Either taskId + responseText or agentId + telegramIdentityId + externalChatId are required",
        },
        { status: 400 },
      );
    }

    const payload =
      body.payload && typeof body.payload === "object"
        ? (body.payload as Record<string, unknown>)
        : typeof body.text === "string" && body.text.trim().length > 0
          ? { text: body.text.trim() }
          : null;

    if (!payload) {
      return NextResponse.json(
        { error: "payload object or text string is required" },
        { status: 400 },
      );
    }

    const type =
      typeof body.type === "string" &&
      Object.values(OUTBOUND_TRANSPORT_MESSAGE_TYPE).includes(
        body.type as (typeof OUTBOUND_TRANSPORT_MESSAGE_TYPE)[keyof typeof OUTBOUND_TRANSPORT_MESSAGE_TYPE],
      )
        ? (body.type as (typeof OUTBOUND_TRANSPORT_MESSAGE_TYPE)[keyof typeof OUTBOUND_TRANSPORT_MESSAGE_TYPE])
        : undefined;

    const message = await enqueueOutboundTransportMessage({
      agentId,
      telegramIdentityId,
      externalChatId,
      payload,
      type,
      conversationThreadId:
        typeof body.conversationThreadId === "string"
          ? body.conversationThreadId
          : null,
      fleetTaskId:
        typeof body.fleetTaskId === "string" ? body.fleetTaskId : null,
      externalMessageId:
        typeof body.externalMessageId === "string"
          ? body.externalMessageId
          : null,
      maxAttempts:
        typeof body.maxAttempts === "number" ? body.maxAttempts : undefined,
    });

    return NextResponse.json({ message });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Outbound] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
