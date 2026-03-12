import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  createWorkspaceComposioSession,
  getWorkspaceComposioState,
} from "@/lib/composio";
import { getStatusError } from "@/lib/http-error";
import { evaluateComposioReadiness } from "@/lib/workspace-integrations";

export async function GET(request: NextRequest) {
  try {
    const { workspaceId } = await requireAuth(request);
    const composio = await getWorkspaceComposioState(workspaceId);

    return NextResponse.json({
      workspaceId,
      composio,
      readiness: evaluateComposioReadiness(composio),
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Workspace/Integrations/Composio/Session] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await requireAuth(request);
    const body = (await request.json()) as Record<string, unknown>;

    const toolkits = Array.isArray(body.toolkits)
      ? body.toolkits.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const tools = Array.isArray(body.tools)
      ? body.tools.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const connectedAccountIds = Array.isArray(body.connectedAccountIds)
      ? body.connectedAccountIds.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        )
      : [];

    const session = await createWorkspaceComposioSession({
      workspaceId,
      toolkits,
      tools,
      connectedAccountIds,
      force: body.force === true,
    });
    const composio = await getWorkspaceComposioState(workspaceId);

    return NextResponse.json({
      ok: true,
      workspaceId,
      session,
      composio,
      readiness: evaluateComposioReadiness(composio),
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Workspace/Integrations/Composio/Session] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
