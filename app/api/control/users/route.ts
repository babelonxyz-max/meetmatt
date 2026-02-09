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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const isBanned = searchParams.get("isBanned");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { walletAddress: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (isBanned !== null && isBanned !== undefined) {
      where.isBanned = isBanned === "true";
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          agents: {
            select: {
              id: true,
              name: true,
              status: true,
              subscriptionStatus: true,
            },
          },
          _count: {
            select: {
              agents: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
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
