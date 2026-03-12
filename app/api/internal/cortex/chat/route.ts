import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionRequest } from "@/lib/cortex/types";
import { completeViaCortexGateway } from "@/lib/cortex/client";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
    const request =
      body.request && typeof body.request === "object"
        ? (body.request as ChatCompletionRequest)
        : null;

    if (!agentId || !request || !Array.isArray(request.messages)) {
      return NextResponse.json(
        { error: "agentId and request.messages are required" },
        { status: 400 },
      );
    }

    if (request.stream === true) {
      return NextResponse.json(
        { error: "Streaming is not supported by this internal route" },
        { status: 400 },
      );
    }

    const response = await completeViaCortexGateway({
      agentId,
      request,
      skillSlug:
        typeof body.skillSlug === "string" && body.skillSlug.trim().length > 0
          ? body.skillSlug.trim()
          : null,
      units:
        typeof body.units === "number" && Number.isFinite(body.units) && body.units > 0
          ? Math.floor(body.units)
          : 1,
      runId:
        typeof body.runId === "string" && body.runId.trim().length > 0
          ? body.runId.trim()
          : null,
      userId:
        typeof body.userId === "string" && body.userId.trim().length > 0
          ? body.userId.trim()
          : null,
      timeoutMs:
        typeof body.timeoutMs === "number" && Number.isFinite(body.timeoutMs) && body.timeoutMs > 0
          ? Math.floor(body.timeoutMs)
          : undefined,
    });

    return NextResponse.json({ response });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Cortex/Chat] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
