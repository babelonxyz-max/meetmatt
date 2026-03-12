import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { OWNER_TYPE } from "@/lib/agent-blueprint";
import { getStatusError } from "@/lib/http-error";

const FLEET_TYPES = [
  "internal_support",
  "internal_account_management",
  "internal_ops",
  "customer",
] as const;

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);

    const fleets = await prisma.fleet.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            memberships: true,
            tasks: true,
            runs: true,
          },
        },
      },
    });

    return NextResponse.json({ fleets });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Fleet] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = await req.json();

    const slug = String(body.slug || "").trim();
    const name = String(body.name || "").trim();
    const type = String(body.type || "").trim();

    if (!slug || !name || !type) {
      return NextResponse.json(
        { error: "slug, name, and type are required" },
        { status: 400 },
      );
    }

    if (!FLEET_TYPES.includes(type as (typeof FLEET_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid fleet type" }, { status: 400 });
    }

    const fleet = await prisma.fleet.create({
      data: {
        slug,
        name,
        description:
          typeof body.description === "string" ? body.description : null,
        type: type as (typeof FLEET_TYPES)[number],
        ownerType: OWNER_TYPE.mattInternal,
        cortexId:
          typeof body.cortexId === "string" && body.cortexId.length > 0
            ? body.cortexId
            : null,
        status:
          typeof body.status === "string" && body.status.length > 0
            ? body.status
            : "active",
      },
    });

    return NextResponse.json({ fleet });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Fleet] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
