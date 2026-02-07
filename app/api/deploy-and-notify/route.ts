import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDevinSession, pollForCompletion } from "@/lib/devin";

const ALLOWED_USER_ID = "cmlbr0nx403wzl40d6s7p3du6";
const notifications: any[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { privyId, agentName, useCase, scope, contactMethod, sessionId } = body;

    if (privyId !== ALLOWED_USER_ID) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create user and agent
    let user = await prisma.user.findUnique({ where: { privyId } });
    if (!user) {
      user = await prisma.user.create({ data: { privyId, lastLoginAt: new Date() } });
    }

    const baseSlug = agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const agent = await prisma.agent.create({
      data: {
        sessionId: sessionId || `manual-${Date.now()}`,
        slug: `${baseSlug}-${Date.now().toString(36)}`,
        name: agentName,
        purpose: scope || useCase,
        features: [JSON.stringify({ useCase, scope, contactMethod })],
        tier: "matt",
        status: "pending",
        userId: user.id,
        activationStatus: "activating",
        subscriptionStatus: "active",
        subscriptionType: "monthly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.payment.create({
      data: {
        sessionId: `manual-${agent.id}`,
        userId: user.id,
        tier: "matt",
        currency: "USDH",
        amount: 135,
        address: "manual",
        status: "confirmed",
        confirmedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Add notification
    notifications.unshift({
      timestamp: new Date().toISOString(),
      type: "DEPLOYMENT_STARTED",
      message: `🚀 Agent "${agentName}" deployment started`,
      data: { agentId: agent.id, agentName, useCase },
    });

    // Auto-trigger Devin
    deployAgent(agent.id, { name: agentName, useCase, scope, contactMethod: contactMethod || "telegram" });

    return NextResponse.json({
      success: true,
      agent: { id: agent.id, name: agent.name, status: agent.status },
      notification: notifications[0],
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ notifications: notifications.slice(0, 20), count: notifications.length });
}

async function deployAgent(agentId: string, config: any) {
  try {
    const devinSession = await createDevinSession(config);
    await prisma.agent.update({
      where: { id: agentId },
      data: { devinSessionId: devinSession.sessionId, devinUrl: devinSession.url, status: "deploying" },
    });

    notifications.unshift({
      timestamp: new Date().toISOString(),
      type: "DEVIN_STARTED",
      message: `🤖 Devin session created: ${devinSession.sessionId}`,
      data: { agentId, devinUrl: devinSession.url },
    });

    pollForCompletion(devinSession.sessionId, async (status) => {
      if (status === "completed") {
        await prisma.agent.update({
          where: { id: agentId },
          data: { status: "active", activationStatus: "awaiting_verification" },
        });
        notifications.unshift({
          timestamp: new Date().toISOString(),
          type: "DEPLOYMENT_COMPLETE",
          message: `✅ Deployment complete!`,
          data: { agentId },
        });
      } else if (status === "error") {
        notifications.unshift({
          timestamp: new Date().toISOString(),
          type: "DEPLOYMENT_FAILED",
          message: `❌ Deployment failed`,
          data: { agentId },
        });
      }
    });
  } catch (error: any) {
    notifications.unshift({
      timestamp: new Date().toISOString(),
      type: "ERROR",
      message: `❌ Error: ${error.message}`,
      data: { agentId },
    });
  }
}
