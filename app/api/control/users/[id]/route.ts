import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/control/users/[id] - Get user details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        agents: {
          select: {
            id: true,
            name: true,
            status: true,
            subscriptionStatus: true,
            currentPeriodEnd: true,
            createdAt: true,
          },
        },
        adminNotes: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get payment history
    const payments = await prisma.payment.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get activity log
    const activities = await prisma.activityLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      user,
      payments,
      activities,
    });
  } catch (error: any) {
    console.error("[Control] Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}

// PATCH /api/control/users/[id] - Update user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, isBanned, banReason } = body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(isBanned !== undefined && { isBanned }),
        ...(banReason !== undefined && { banReason }),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "user_updated",
        entityType: "user",
        entityId: id,
        metadata: JSON.stringify({ updatedFields: Object.keys(body) }),
      },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("[Control] Update user error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/control/users/[id] - Delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // First delete related records
    await prisma.adminNote.deleteMany({
      where: { userId: id },
    });

    await prisma.agent.deleteMany({
      where: { userId: id },
    });

    await prisma.payment.deleteMany({
      where: { userId: id },
    });

    // Then delete user
    await prisma.user.delete({
      where: { id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "user_deleted",
        entityType: "user",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Control] Delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
