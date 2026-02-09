import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/app/control/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("control_session");
    const session = sessionCookie ? JSON.parse(sessionCookie.value) : null;

    if (!verifySession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get users with their agents
    const users = await prisma.user.findMany({
      include: {
        agents: {
          select: {
            id: true,
            name: true,
            status: true,
            subscriptionStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[Control Users] Error:", error);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 }
    );
  }
}

// Update user
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("control_session");
    const session = sessionCookie ? JSON.parse(sessionCookie.value) : null;

    if (!verifySession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, data } = await req.json();

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("[Control Users] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// Delete user
export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("control_session");
    const session = sessionCookie ? JSON.parse(sessionCookie.value) : null;

    if (!verifySession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json();

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Control Users] Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
