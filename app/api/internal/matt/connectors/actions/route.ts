import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { executeMattConnectorAction } from "@/lib/matt-connectors";
import { getStatusError } from "@/lib/http-error";

export async function POST(request: NextRequest) {
  try {
    requireAdminOrInternal(request);
    const body = (await request.json()) as Record<string, unknown>;

    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const composioInput =
      body.composioInput && typeof body.composioInput === "object" && !Array.isArray(body.composioInput)
        ? (body.composioInput as Record<string, unknown>)
        : null;
    const fallbackArgs = Array.isArray(body.fallbackArgs) ? body.fallbackArgs : undefined;

    const result = await executeMattConnectorAction({
      agentId,
      composioToolSlug:
        typeof body.composioToolSlug === "string" ? body.composioToolSlug.trim() : null,
      composioInput,
      composioToolkits: Array.isArray(body.composioToolkits)
        ? body.composioToolkits.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          )
        : undefined,
      fallbackProvider:
        typeof body.fallbackProvider === "string" ? body.fallbackProvider.trim() : null,
      fallbackAction:
        typeof body.fallbackAction === "string" ? body.fallbackAction.trim() : null,
      fallbackArgs,
      allowSeshFallback: body.allowSeshFallback !== false,
      runId: typeof body.runId === "string" ? body.runId.trim() : null,
      userId: typeof body.userId === "string" ? body.userId.trim() : null,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Matt/Connectors/Actions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
