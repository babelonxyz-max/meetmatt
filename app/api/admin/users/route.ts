import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/crypto-utils";
import { RateLimiter } from "@/lib/api-middleware";

const adminLimiter = new RateLimiter(10, 60000);

function verifyAuth(request: NextRequest): boolean {
  const token = process.env.ADMIN_AUTH_TOKEN;
  if (!token) return false;
  const authHeader = request.headers.get("authorization");
  return !!authHeader && safeCompare(authHeader, `Bearer ${token}`);
}

// GET /api/admin/users - List all users with their agents
export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get("x-forwarded-for") ||
                   request.headers.get("x-real-ip") ||
                   "unknown";
  const rateCheck = adminLimiter.check(clientId);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
    );
  }

  if (!process.env.ADMIN_AUTH_TOKEN) {
    return NextResponse.json({ error: "Admin auth not configured" }, { status: 503 });
  }
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
        walletAddress: u.walletAddress,
        createdAt: u.createdAt,
        agentCount: u.agents.length,
        agents: u.agents,
      })),
    });
  } catch (error: any) {
    console.error("[Admin/Users] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
