import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { syncCapabilityCommerceCatalog } from "@/lib/capability-commerce/registry";

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    await syncCapabilityCommerceCatalog();

    const useCases = await prisma.useCaseTemplate.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        items: {
          include: {
            catalogItem: {
              include: {
                skillLinks: {
                  include: {
                    skillDefinition: true,
                  },
                },
                entitlementLinks: {
                  include: {
                    entitlementPack: true,
                  },
                },
              },
            },
          },
          orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        },
        entitlements: {
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

    return NextResponse.json({ useCases });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/UseCases] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    await syncCapabilityCommerceCatalog();
    return NextResponse.json({ synced: true });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/UseCases] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
