import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listComposioToolkits } from "@/lib/composio";
import { getStatusError } from "@/lib/http-error";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const providers = await listComposioToolkits({
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      limit: searchParams.get("limit")
        ? Number.parseInt(searchParams.get("limit") || "50", 10)
        : undefined,
    });

    return NextResponse.json({
      providers,
      count: providers.length,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Workspace/Integrations/Composio/Providers] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
