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

    // Get stats
    const [
      totalUsers,
      totalAgents,
      activeAgents,
      totalPayments,
      pendingPayments,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.agent.count(),
      prisma.agent.count({ where: { subscriptionStatus: "active" } }),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "pending" } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Calculate total revenue from confirmed payments
    const confirmedPayments = await prisma.payment.findMany({
      where: { status: "confirmed" },
      select: { amount: true },
    });

    const totalRevenue = confirmedPayments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    return NextResponse.json({
      totalUsers,
      totalAgents,
      activeAgents,
      totalRevenue: Math.round(totalRevenue),
      pendingPayments,
      recentSignups: recentUsers,
    });
  } catch (error) {
    console.error("[Control Stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
