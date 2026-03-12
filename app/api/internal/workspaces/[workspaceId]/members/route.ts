import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { upsertWorkspaceMembership } from "@/lib/workspaces";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    requireAdminOrInternal(req);
    const { workspaceId } = await context.params;

    const memberships = await prisma.workspaceMembership.findMany({
      where: { workspaceId },
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
    });

    return NextResponse.json({ memberships });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/WorkspaceMembers] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    requireAdminOrInternal(req);
    const { workspaceId } = await context.params;
    const body = (await req.json()) as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const membership = await upsertWorkspaceMembership({
      workspaceId,
      userId,
      role:
        body.role === "owner" || body.role === "admin" || body.role === "member"
          ? body.role
          : "member",
      isDefault: body.isDefault === true,
    });

    return NextResponse.json({ membership });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/WorkspaceMembers] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
