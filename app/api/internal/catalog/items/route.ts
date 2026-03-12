import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { syncCapabilityCommerceCatalog } from "@/lib/capability-commerce/registry";

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    await syncCapabilityCommerceCatalog();

    const items = await prisma.catalogItem.findMany({
      orderBy: [{ itemType: "asc" }, { name: "asc" }],
      include: {
        skillLinks: {
          include: {
            skillDefinition: {
              include: {
                implementations: {
                  orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
                },
              },
            },
          },
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        },
        entitlementLinks: {
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
          },
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    return NextResponse.json({ items });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Catalog/Items] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
