import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDevinSession, pollForCompletion } from "@/lib/devin";

const ALLOWED_USER_ID = "cmlbr0nx403wzl40d6s7p3du6";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      privyId, 
      agentName, 
      useCase, 
      scope, 
      contactMethod,
      sessionId 
    } = body;

    // Only allow the specific user
    if (privyId !== ALLOWED_USER_ID) {
      return NextResponse.json(
        { error: "Unauthorized user" },
        { status: 403 }
      );
    }

    if (!agentName || !useCase) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find or create the user
    let user = await prisma.user.findUnique({
      where: { privyId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          privyId,
          lastLoginAt: new Date(),
        },
      });
    }

    // Generate unique slug
    const baseSlug = agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    // Create agent record
    const agent = await prisma.agent.create({
      data: {
        sessionId: sessionId || `manual-${Date.now()}`,
        slug: uniqueSlug,
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

    // Create a payment record (marked as completed)
    await prisma.payment.create({
      data: {
        sessionId: `manual-payment-${agent.id}`,
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

    // Trigger Devin deployment in background
    deployAgent(agent.id, {
      name: agentName,
      useCase,
      scope,
      contactMethod: contactMethod || "telegram",
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        status: agent.status,
        activationStatus: agent.activationStatus,
      },
      message: "Agent deployment started! Check your dashboard for updates.",
    });

  } catch (error: any) {
    console.error("[DeployForUser] Error:", error);
    return NextResponse.json(
      { error: error.message || "Deployment failed" },
      { status: 500 }
    );
  }
}

async function deployAgent(
  agentId: string,
  config: {
    name: string;
    useCase: string;
    scope: string;
    contactMethod: string;
  }
) {
  try {
    console.log(`[DeployForUser] Starting Devin deployment for agent ${agentId}`);
    
    const devinSession = await createDevinSession({
      name: config.name,
      useCase: config.useCase,
      scope: config.scope,
      contactMethod: config.contactMethod,
    });

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        devinSessionId: devinSession.sessionId,
        devinUrl: devinSession.url,
        status: "deploying",
      },
    });

    console.log(`[DeployForUser] Devin session created: ${devinSession.sessionId}`);

    // Poll for completion
    pollForCompletion(devinSession.sessionId, async (status) => {
      console.log(`[DeployForUser] Agent ${agentId} deployment status: ${status}`);

      if (status === "completed") {
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            status: "active",
            activationStatus: "awaiting_verification",
          },
        });
        console.log(`[DeployForUser] Agent ${agentId} deployed successfully!`);
      } else if (status === "error") {
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            status: "error",
            activationStatus: "failed",
          },
        });
        console.error(`[DeployForUser] Agent ${agentId} deployment failed`);
      }
    });

  } catch (error) {
    console.error(`[DeployForUser] Failed to deploy agent ${agentId}:`, error);
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: "error",
        activationStatus: "failed",
      },
    });
  }
}
