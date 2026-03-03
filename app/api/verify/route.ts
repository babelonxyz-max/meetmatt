import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { safeCompare } from "@/lib/crypto-utils";
import { RateLimiter } from "@/lib/api-middleware";

// Strict rate limit: 5 attempts per minute per IP to prevent brute force
const verifyLimiter = new RateLimiter(5, 60000);

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get("x-forwarded-for") ||
                   request.headers.get("x-real-ip") ||
                   "unknown";
  const rateCheck = verifyLimiter.check(clientId);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) },
      }
    );
  }

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

    if (!safeCompare(agent.authCode ?? "", code)) {
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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
