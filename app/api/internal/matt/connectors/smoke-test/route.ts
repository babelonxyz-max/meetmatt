import { NextRequest, NextResponse } from "next/server";
import { getStatusError } from "@/lib/http-error";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { smokeTestMattConnectorAction } from "@/lib/matt-connectors";

export async function POST(request: NextRequest) {
  try {
    requireAdminOrInternal(request);
    const body = (await request.json()) as Record<string, unknown>;

    const workspaceId =
      typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const result = await smokeTestMattConnectorAction({
      workspaceId,
      composioToolSlug:
        typeof body.composioToolSlug === "string" ? body.composioToolSlug.trim() : null,
      composioInput:
        body.composioInput &&
        typeof body.composioInput === "object" &&
        !Array.isArray(body.composioInput)
          ? (body.composioInput as Record<string, unknown>)
          : null,
      composioToolkits: Array.isArray(body.composioToolkits)
        ? body.composioToolkits.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          )
        : undefined,
      fallbackProvider:
        typeof body.fallbackProvider === "string" ? body.fallbackProvider.trim() : null,
      fallbackAction:
        typeof body.fallbackAction === "string" ? body.fallbackAction.trim() : null,
      fallbackArgs: Array.isArray(body.fallbackArgs) ? body.fallbackArgs : undefined,
      allowSeshFallback: body.allowSeshFallback !== false,
    });

    return NextResponse.json({
      ok: result.ok,
      result,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Matt/Connectors/SmokeTest] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
