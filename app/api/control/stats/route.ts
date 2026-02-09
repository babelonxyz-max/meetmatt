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

    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all stats in parallel
    const [
      totalUsers,
      totalAgents,
      activeAgents,
      pendingAgents,
      failedAgents,
      totalPayments,
      pendingPayments,
      confirmedPayments,
      recentUsers,
      recentAgents,
      recentPayments,
      bannedUsers,
      expiringSubscriptions,
    ] = await Promise.all([
      // Basic counts
      prisma.user.count(),
      prisma.agent.count(),
      prisma.agent.count({ where: { subscriptionStatus: "active" } }),
      prisma.agent.count({ where: { status: "pending" } }),
      prisma.agent.count({ where: { status: "error" } }),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "pending" } }),
      prisma.payment.count({ where: { status: "confirmed" } }),
      
      // Recent activity (7 days)
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.agent.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.payment.count({
        where: { createdAt: { gte: sevenDaysAgo }, status: "confirmed" },
      }),
      
      // Other important stats
      prisma.user.count({ where: { isBanned: true } }),
      prisma.agent.count({
        where: {
          subscriptionStatus: "active",
          currentPeriodEnd: {
            lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
            gte: today,
          },
        },
      }),
    ]);

    // Calculate total revenue from confirmed payments
    const confirmedPaymentsData = await prisma.payment.findMany({
      where: { status: "confirmed" },
      select: { amount: true },
    });

    const totalRevenue = confirmedPaymentsData.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    // Calculate revenue from last 30 days
    const recentRevenueData = await prisma.payment.findMany({
      where: {
        status: "confirmed",
        confirmedAt: { gte: thirtyDaysAgo },
      },
      select: { amount: true },
    });

    const monthlyRecurringRevenue = recentRevenueData.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    // Get tier distribution
    const tierDistribution = await prisma.agent.groupBy({
      by: ["tier"],
      _count: { tier: true },
    });

    // Get status distribution
    const statusDistribution = await prisma.agent.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    return NextResponse.json({
      // User stats
      totalUsers,
      recentSignups: recentUsers,
      bannedUsers,
      
      // Agent stats
      totalAgents,
      activeAgents,
      pendingAgents,
      failedAgents,
      recentAgents,
      expiringSubscriptions,
      
      // Payment stats
      totalRevenue: Math.round(totalRevenue),
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue),
      pendingPayments,
      confirmedPayments,
      recentPayments,
      
      // Distributions
      tierDistribution,
      statusDistribution,
    });
  } catch (error) {
    console.error("[Control Stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
