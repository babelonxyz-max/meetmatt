import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { privyClient } from "@/lib/privy";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    
    // Verify with Privy
    let userData;
    try {
      userData = await privyClient.getUser(token);
    } catch (privyError: any) {
      console.error("[Dashboard] Privy error:", privyError);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    if (!userData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("[Dashboard] User data:", { id: userData.id, email: userData.email?.address });

    // Find or create user
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { privyId: userData.id },
      });

      if (!user) {
        console.log("[Dashboard] Creating new user");
        user = await prisma.user.create({
          data: {
            privyId: userData.id,
            email: userData.email?.address || null,
            walletAddress: userData.wallet?.address || null,
            lastLoginAt: new Date(),
          },
        });
      }
    } catch (dbError: any) {
      console.error("[Dashboard] Database user error:", dbError);
      return NextResponse.json({ error: "Database error: " + dbError.message }, { status: 500 });
    }

    console.log("[Dashboard] User:", { id: user.id, email: user.email });

    // Get agents
    let agents: any[] = [];
    try {
      agents = await prisma.agent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      console.log("[Dashboard] Agents found:", agents.length);
    } catch (agentError: any) {
      console.error("[Dashboard] Agent query error:", agentError);
      return NextResponse.json({ error: "Agent query error: " + agentError.message }, { status: 500 });
    }

    // Get payments
    let payments: any[] = [];
    try {
      payments = await prisma.payment.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    } catch (paymentError: any) {
      console.error("[Dashboard] Payment query error:", paymentError);
    }

    const activeAgents = agents.filter(a => a.subscriptionStatus === "active").length;
    const expiredAgents = agents.filter(a => a.subscriptionStatus === "expired").length;
    const trialAgents = agents.filter(a => a.subscriptionStatus === "trial").length;

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
        activeSubscriptions: activeAgents,
        expired: expiredAgents,
        inTrial: trialAgents,
      },
    });
  } catch (error: any) {
    console.error("[Dashboard] Unhandled error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard: " + error.message },
      { status: 500 }
    );
  }
}
