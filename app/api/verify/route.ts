// API Route: Verify ownership of an agent instance
// POST /api/verify - Verify code and activate instance

import { NextRequest, NextResponse } from "next/server";
import { verifyCode, clearVerificationRequest } from "@/lib/provisioning/verification";
import { activateInstance, getInstance } from "@/lib/provisioning/provisioner";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceId, code, telegramUserId } = body;

    // Validate required fields
    if (!instanceId || !code || !telegramUserId) {
      return NextResponse.json(
        { error: "Missing required fields: instanceId, code, telegramUserId" },
        { status: 400 }
      );
    }

    // Check instance exists
    const instance = getInstance(instanceId);
    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }

    // Check instance is awaiting verification
    if (instance.status !== "awaiting_verification") {
      return NextResponse.json(
        { 
          error: "Instance is not awaiting verification",
          currentStatus: instance.status 
        },
        { status: 400 }
      );
    }

    // Verify the code
    const verification = verifyCode(instanceId, code, telegramUserId);
    
    if (!verification.valid) {
      return NextResponse.json(
        { valid: false, error: verification.error },
        { status: 400 }
      );
    }

    // Activate the instance
    const activated = activateInstance(instanceId, telegramUserId);
    
    if (!activated) {
      return NextResponse.json(
        { error: "Failed to activate instance" },
        { status: 500 }
      );
    }

    // Clear the verification request
    clearVerificationRequest(instanceId);

    return NextResponse.json({
      valid: true,
      message: "Verification successful! Your bot is now active.",
      instanceId,
      botUsername: instance.botUsername,
    });

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
