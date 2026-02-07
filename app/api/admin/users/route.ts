import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_TOKEN = process.env.ADMIN_AUTH_TOKEN || "admin-secret-token";

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return !!authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`;
}

// GET /api/admin/users - List all users with their agents
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        agents: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            subscriptionStatus: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        privyId: u.privyId,
        walletAddress: u.walletAddress,
        createdAt: u.createdAt,
        agentCount: u.agents.length,
        agents: u.agents,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
