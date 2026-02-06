// API Route: Verify ownership of an agent instance
// POST /api/verify - Verify code and activate instance

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceId, code, telegramUserId } = body;

    // Validate required fields
    if (!instanceId || !code) {
      return NextResponse.json(
        { error: "Missing required fields: instanceId, code" },
        { status: 400 }
      );
    }

    // Get agent from database
    const agent = await prisma.agent.findUnique({
      where: { id: instanceId },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Check agent is awaiting verification
    if (agent.activationStatus !== "awaiting_verification") {
      return NextResponse.json(
        { 
          error: "Agent is not awaiting verification",
          currentStatus: agent.activationStatus 
        },
        { status: 400 }
      );
    }

    // Verify the code matches
    if (agent.authCode !== code) {
      return NextResponse.json(
        { valid: false, error: "Invalid auth code" },
        { status: 400 }
      );
    }

    // Activate the agent
    const updatedAgent = await prisma.agent.update({
      where: { id: instanceId },
      data: {
        activationStatus: "active",
        verifiedAt: new Date(),
        telegramUserId: telegramUserId || null,
        status: "active",
      },
    });

    // TODO: Notify Devin to make user admin of the bot
    // This would be a webhook call to Devin or the provisioning system
    console.log(`[Verify] Agent ${instanceId} activated for user ${telegramUserId}`);

    return NextResponse.json({
      valid: true,
      message: "Verification successful! Your bot is now active.",
      instanceId,
      botUsername: updatedAgent.botUsername,
    });

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
