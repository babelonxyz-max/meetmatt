import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { privyId, email, walletAddress } = body;

    if (!privyId) {
      return NextResponse.json({ error: "Missing privyId" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { privyId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          privyId,
          email: email || null,
          walletAddress: walletAddress || null,
          lastLoginAt: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const agents = await prisma.agent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
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
    console.error("[User/Me] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
