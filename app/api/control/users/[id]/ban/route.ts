import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/control/users/[id]/ban - Ban or unban user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { isBanned, reason } = body;

    if (typeof isBanned !== "boolean") {
      return NextResponse.json(
        { error: "isBanned boolean required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned,
        banReason: isBanned ? reason : null,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: isBanned ? "user_banned" : "user_unbanned",
        entityType: "user",
        entityId: id,
        metadata: JSON.stringify({ reason }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        isBanned: user.isBanned,
        banReason: user.banReason,
      },
    });
  } catch (error: any) {
    console.error("[Control] Ban user error:", error);
    return NextResponse.json(
      { error: "Failed to update ban status" },
      { status: 500 }
    );
  }
}
