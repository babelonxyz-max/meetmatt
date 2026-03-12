import { NextRequest, NextResponse } from "next/server";
import { validateWorkspaceComposioReadiness } from "@/lib/composio";
import { getStatusError } from "@/lib/http-error";
import { requireAdminOrInternal } from "@/lib/internal-auth";

export async function POST(request: NextRequest) {
  try {
    requireAdminOrInternal(request);
    const body = (await request.json()) as Record<string, unknown>;

    const workspaceId =
      typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const result = await validateWorkspaceComposioReadiness({
      workspaceId,
      toolkits: Array.isArray(body.toolkits)
        ? body.toolkits.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          )
        : undefined,
      tools: Array.isArray(body.tools)
        ? body.tools.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          )
        : undefined,
      connectedAccountIds: Array.isArray(body.connectedAccountIds)
        ? body.connectedAccountIds.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0,
          )
        : undefined,
      smokeTestToolSlug:
        typeof body.smokeTestToolSlug === "string"
          ? body.smokeTestToolSlug.trim()
          : null,
      smokeTestInput:
        body.smokeTestInput &&
        typeof body.smokeTestInput === "object" &&
        !Array.isArray(body.smokeTestInput)
          ? (body.smokeTestInput as Record<string, unknown>)
          : undefined,
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

    console.error("[Internal/Matt/Connectors/Validate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
