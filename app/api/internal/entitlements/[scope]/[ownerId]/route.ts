import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { prisma } from "@/lib/prisma";
import { syncCapabilityCommerceCatalog } from "@/lib/capability-commerce/registry";

type RouteContext = {
  params: Promise<{
    scope: string;
    ownerId: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    requireAdminOrInternal(req);
    await syncCapabilityCommerceCatalog();
    const { scope, ownerId } = await context.params;

    if (scope !== "agent" && scope !== "workspace") {
      return NextResponse.json(
        { error: "scope must be agent or workspace" },
        { status: 400 },
      );
    }

    const grants = await prisma.entitlementPackGrant.findMany({
      where: {
        scopeType: scope === "workspace" ? "workspace" : "agent",
        agentId: scope === "agent" ? ownerId : undefined,
        workspaceId: scope === "workspace" ? ownerId : undefined,
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
      include: {
        entitlementPack: {
          include: {
            skillAllowances: {
              include: {
                skillDefinition: true,
              },
            },
          },
        },
        allowances: {
          include: {
            skillDefinition: true,
          },
        },
      },
    });

    return NextResponse.json({ grants });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Entitlements] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
