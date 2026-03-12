import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getWorkspaceComposioState,
  listWorkspaceComposioConnectedAccounts,
} from "@/lib/composio";
import { getStatusError } from "@/lib/http-error";
import { evaluateComposioReadiness } from "@/lib/workspace-integrations";

export async function GET(request: NextRequest) {
  try {
    const { workspaceId } = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const toolkitSlug = searchParams.get("toolkitSlug")?.trim() || undefined;

    const connectedAccounts = await listWorkspaceComposioConnectedAccounts({
      workspaceId,
      toolkitSlug,
    });

    const composio = await getWorkspaceComposioState(workspaceId);
    return NextResponse.json({
      workspaceId,
      toolkitSlug: toolkitSlug ?? null,
      connectedAccounts,
      count: connectedAccounts.length,
      readiness: evaluateComposioReadiness(composio),
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Workspace/Integrations/Composio/ConnectedAccounts] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
