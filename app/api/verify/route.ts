import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { safeCompare } from "@/lib/crypto-utils";
import { verifyLimiter } from "@/lib/rate-limit";
import { getStatusError } from "@/lib/http-error";

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get("x-forwarded-for") ||
                   request.headers.get("x-real-ip") ||
                   "unknown";
  const rateCheck = await verifyLimiter.check(clientId);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateCheck.reset - Date.now()) / 1000)) },
      }
    );
  }

  try {
    const { userId, workspaceId } = await requireAuth(request);
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

    if (
      !agent ||
      (
        agent.workspaceId !== workspaceId &&
        !(agent.workspaceId === null && agent.userId === userId)
      )
    ) {
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

  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
