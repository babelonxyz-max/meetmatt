import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const body = await request.json();
    const { instanceId, code, telegramUserId } = body;

    if (!instanceId || !code) {
      return NextResponse.json(
        { error: "Missing required fields: instanceId, code" },
        { status: 400 }
      );
    }

    // Get agent and verify ownership
    const agent = await prisma.agent.findUnique({
      where: { id: instanceId },
    });

    if (!agent || agent.userId !== userId) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    if (agent.activationStatus !== "awaiting_verification") {
      return NextResponse.json(
        {
          error: "Agent is not awaiting verification",
          currentStatus: agent.activationStatus
        },
        { status: 400 }
      );
    }

    if (agent.authCode !== code) {
      return NextResponse.json(
        { valid: false, error: "Invalid auth code" },
        { status: 400 }
      );
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: instanceId },
      data: {
        activationStatus: "active",
        verifiedAt: new Date(),
        telegramUserId: telegramUserId || null,
        status: "active",
      },
    });

    console.log(`[Verify] Agent ${instanceId} activated for user ${telegramUserId}`);

    return NextResponse.json({
      valid: true,
      message: "Verification successful! Your bot is now active.",
      instanceId,
      botUsername: updatedAgent.botUsername,
    });

  } catch (error: any) {
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
