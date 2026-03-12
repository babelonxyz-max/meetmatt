import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { buildAgentLoadoutSnapshot } from "@/lib/capability-commerce/provisioning";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    requireAdminOrInternal(req);
    const { id } = await context.params;
    const loadout = await buildAgentLoadoutSnapshot(id);
    return NextResponse.json({ loadout });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Agents/Loadout] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
