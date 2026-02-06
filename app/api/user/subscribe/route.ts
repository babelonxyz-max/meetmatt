import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privyClient } from "@/lib/privy";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const userData = await privyClient.getUser(token);
    
    if (!userData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, type } = body;

    if (!agentId || !type || !["monthly", "annual"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid request. Need agentId and type (monthly/annual)" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { privyId: userData.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: user.id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const prices = { monthly: 99, annual: 950 };
    const amount = prices[type as keyof typeof prices];
    const sessionId = `sub_${Date.now()}_${agentId}`;
    
    const now = new Date();
    const periodEnd = new Date(now);
    if (type === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const payment = await prisma.payment.create({
      data: {
        sessionId,
        userId: user.id,
        tier: agent.tier,
        currency: "USDH",
        amount,
        address: "",
        status: "pending",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await prisma.agent.update({
      where: { id: agentId },
      data: { lastPaymentId: payment.id },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      sessionId,
      amount,
      type,
      periodEnd,
      message: `Please pay ${amount} USDH to renew your subscription`,
    });
  } catch (error: any) {
    console.error("[Subscribe] Error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
