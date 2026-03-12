import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { ensureMattRelationshipPack } from "@/lib/matt-relationships";
import { getStatusError } from "@/lib/http-error";
import { ensurePersonalWorkspaceForUser } from "@/lib/workspaces";

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const workspaceId = searchParams.get("workspaceId");

    if (userId) {
      const seeded = await ensureMattRelationshipPack({ userId, workspaceId });
      return NextResponse.json(seeded);
    }

    const relationships = await prisma.customerRelationship.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            status: true,
            agentKind: true,
            transportProvider: true,
            cortexId: true,
          },
        },
      },
    });

    return NextResponse.json({ relationships });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Matt/Relationships] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = await req.json();
    const userId = String(body.userId || "").trim();
    const workspaceId =
      typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const resolvedWorkspaceId =
      workspaceId ||
      (await ensurePersonalWorkspaceForUser(userId)).workspaceId;
    const seeded = await ensureMattRelationshipPack({
      userId,
      workspaceId: resolvedWorkspaceId,
    });
    return NextResponse.json(seeded);
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Matt/Relationships] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
