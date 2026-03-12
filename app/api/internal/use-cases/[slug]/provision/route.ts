import { NextRequest, NextResponse } from "next/server";
import { UseCaseTemplateProvisioningMode } from "@prisma/client";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import {
  buildAgentLoadoutSnapshot,
  provisionAgentUseCaseBundle,
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

    const provisioningModes = Array.isArray(body.provisioningModes)
      ? body.provisioningModes.filter(
          (value): value is UseCaseTemplateProvisioningMode =>
            value === UseCaseTemplateProvisioningMode.grant_on_create ||
            value === UseCaseTemplateProvisioningMode.grant_on_activate,
        )
      : undefined;

    const result = await provisionAgentUseCaseBundle({
      agentId,
      useCaseTemplateSlug: slug,
      provisioningModes,
    });
    const loadout = await buildAgentLoadoutSnapshot(agentId);

    return NextResponse.json({ result, loadout });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/UseCases/Provision] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
