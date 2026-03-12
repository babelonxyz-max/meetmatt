import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/internal-auth";
import { dispatchFleetTask } from "@/lib/fleet-dispatch";
import { getStatusError } from "@/lib/http-error";

export async function POST(req: NextRequest) {
  try {
    if (!isInternalRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const result = await dispatchFleetTask({
      taskId: String(body.taskId || ""),
      status: typeof body.status === "string" ? body.status : null,
      ticketStatus:
        typeof body.ticketStatus === "string" ? body.ticketStatus : null,
      responseText:
        typeof body.responseText === "string" ? body.responseText : null,
      enqueueTransport: body.enqueueTransport !== false,
      telegramIdentityId:
        typeof body.telegramIdentityId === "string"
          ? body.telegramIdentityId
          : null,
      externalMessageId:
        typeof body.externalMessageId === "string"
          ? body.externalMessageId
          : null,
      conversationThreadId:
        typeof body.conversationThreadId === "string"
          ? body.conversationThreadId
          : null,
      result:
        body.result && typeof body.result === "object"
          ? (body.result as Record<string, unknown>)
          : null,
    });

    return NextResponse.json({
      ok: result.ok,
      task: result.task,
      outboundMessage: result.outboundMessage,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json(
        { error: statusError.message },
        { status: statusError.status },
      );
    }

    console.error("[Internal/Telethon/Dispatch] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
