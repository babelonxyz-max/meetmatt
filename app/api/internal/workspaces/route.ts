import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { createWorkspace } from "@/lib/workspaces";

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const { searchParams } = new URL(req.url);
    const take = Math.min(
      Number.parseInt(searchParams.get("take") ?? "50", 10) || 50,
      200,
    );

    const workspaces = await prisma.workspace.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take,
      include: {
        ownerUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        memberships: {
          orderBy: [{ createdAt: "asc" }],
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            agents: true,
            payments: true,
            supportTickets: true,
            telegramIdentities: true,
          },
        },
      },
    });

    return NextResponse.json({ workspaces });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Workspaces] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const ownerUserId =
      typeof body.ownerUserId === "string" ? body.ownerUserId.trim() : "";
    const memberUserIds = Array.isArray(body.memberUserIds)
      ? body.memberUserIds
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value): value is string => value.length > 0)
      : [];

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const workspace = await createWorkspace({
      name,
      slug: slug || null,
      kind: body.kind === "personal" ? "personal" : "company",
      ownerUserId: ownerUserId || null,
      memberUserIds,
    });

    return NextResponse.json({ workspace });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Workspaces] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
