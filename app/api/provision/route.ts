// API Route: Provision a new AI agent
// POST /api/provision - Create new agent instance
// GET /api/provision?instanceId=xxx - Get instance status

import { NextRequest, NextResponse } from "next/server";
import { 
  provisionAgent, 
  getInstance,
  getUserInstances 
} from "@/lib/provisioning/provisioner";
import { 
  ProvisioningConfig, 
  PackageType 
} from "@/lib/provisioning/types";
import { validateAndSanitizeInput } from "@/lib/provisioning/rate-limiter";

// POST: Create new agent instance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { userId, botName, package: packageType, features, paymentId } = body;
    
    if (!userId || !botName || !packageType) {
      return NextResponse.json(
        { error: "Missing required fields: userId, botName, package" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedBotName = validateAndSanitizeInput(botName);
    if (!sanitizedBotName.valid) {
      return NextResponse.json(
        { error: sanitizedBotName.error || "Invalid bot name" },
        { status: 400 }
      );
    }

    // Validate package type
    const validPackages: PackageType[] = ["assistant", "support", "coder", "writer", "custom"];
    if (!validPackages.includes(packageType)) {
      return NextResponse.json(
        { error: `Invalid package. Must be one of: ${validPackages.join(", ")}` },
        { status: 400 }
      );
    }

    // TODO: Verify payment was completed
    // In production, check paymentId against database
    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment required before provisioning" },
        { status: 402 }
      );
    }

    // Create provisioning config
    const config: ProvisioningConfig = {
      userId,
      botName: sanitizedBotName.sanitized || botName,
      botUsername: body.botUsername || "",
      botDescription: body.botDescription,
      package: packageType,
      features: features || [],
    };

    // Start provisioning
    const instance = await provisionAgent(config);

    return NextResponse.json({
      success: true,
      instanceId: instance.instanceId,
      status: instance.status,
      message: "Provisioning started. Check status for updates.",
    });

  } catch (error) {
    console.error("Provisioning error:", error);
    return NextResponse.json(
      { error: "Failed to start provisioning" },
      { status: 500 }
    );
  }
}

// GET: Get instance status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get("instanceId");
    const userId = searchParams.get("userId");

    if (instanceId) {
      // Get specific instance
      const instance = getInstance(instanceId);
      
      if (!instance) {
        return NextResponse.json(
          { error: "Instance not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        instance: {
          instanceId: instance.instanceId,
          status: instance.status,
          publicIp: instance.publicIp,
          botUsername: instance.botUsername,
          verificationCode: instance.status === "awaiting_verification" 
            ? instance.verificationCode 
            : undefined,
          createdAt: instance.createdAt,
        },
      });
    }

    if (userId) {
      // Get all instances for user
      const instances = getUserInstances(userId);
      
      return NextResponse.json({
        success: true,
        instances: instances.map(i => ({
          instanceId: i.instanceId,
          status: i.status,
          botUsername: i.botUsername,
          createdAt: i.createdAt,
        })),
      });
    }

    return NextResponse.json(
      { error: "Provide instanceId or userId parameter" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Get instance error:", error);
    return NextResponse.json(
      { error: "Failed to get instance" },
      { status: 500 }
    );
  }
}
