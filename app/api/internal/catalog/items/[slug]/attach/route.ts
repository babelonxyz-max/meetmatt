import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import {
  attachCatalogItemToAgent,
  buildAgentLoadoutSnapshot,
} from "@/lib/capability-commerce/provisioning";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    requireAdminOrInternal(req);
    const { slug } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";

    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const result = await attachCatalogItemToAgent({
      agentId,
      catalogItemSlug: slug,
      source:
        typeof body.source === "string" && body.source.trim().length > 0
          ? body.source.trim()
          : `internal-attach:${slug}`,
      paymentId:
        typeof body.paymentId === "string" && body.paymentId.trim().length > 0
          ? body.paymentId.trim()
          : null,
      grantLinkedEntitlements:
        typeof body.grantLinkedEntitlements === "boolean"
          ? body.grantLinkedEntitlements
          : true,
    });

    const loadout = await buildAgentLoadoutSnapshot(agentId);
    return NextResponse.json({ result, loadout });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Catalog/Attach] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
