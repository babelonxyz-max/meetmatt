import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update last login
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    const agents = await prisma.agent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        name: user.name,
        createdAt: user.createdAt,
      },
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        subscriptionStatus: agent.subscriptionStatus,
        subscriptionType: agent.subscriptionType,
        currentPeriodEnd: agent.currentPeriodEnd,
        cancelAtPeriodEnd: agent.cancelAtPeriodEnd,
        devinUrl: agent.devinUrl,
        activationStatus: agent.activationStatus,
        botUsername: agent.botUsername,
        telegramLink: agent.telegramLink,
        authCode: agent.authCode,
        createdAt: agent.createdAt,
      })),
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
      })),
      stats: {
        totalAgents: agents.length,
        activeSubscriptions: agents.filter(a => a.subscriptionStatus === "active").length,
        expired: agents.filter(a => a.subscriptionStatus === "expired").length,
        inTrial: agents.filter(a => a.subscriptionStatus === "trial").length,
      },
    });
  } catch (error: any) {
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[User/Me] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
