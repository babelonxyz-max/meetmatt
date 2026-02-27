/**
 * Infrastructure API
 * 
 * GET /api/infrastructure - List provisioned servers
 * POST /api/infrastructure - Provision new servers
 */

import { NextRequest, NextResponse } from "next/server";
import { infrastructureProvisioner } from "@/lib/infrastructure/provisioner";
import { z } from "zod";

// Initialize provisioner (lazy)
let provisionerInitialized = false;
async function ensureProvisioner() {
  if (!provisionerInitialized) {
    await infrastructureProvisioner.initialize();
    provisionerInitialized = true;
  }
}

// Validation schema
const provisionSchema = z.object({
  fleetId: z.string(),
  minInstances: z.number().min(1).max(100),
  maxInstances: z.number().min(1).max(100),
  agentsPerInstance: z.number().min(1).max(100).default(50),
  preferredRegions: z.array(z.string()).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

// POST /api/infrastructure - Provision servers
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const body = await req.json();
    const validation = provisionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues, requestId },
        { status: 400 }
      );
    }

    const userId = req.headers.get("x-user-id") || "anonymous";
    
    await ensureProvisioner();

    const result = await infrastructureProvisioner.provisionForFleet({
      ...validation.data,
      userId,
    });

    return NextResponse.json(
      { success: true, data: result, requestId },
      { headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );

  } catch (error: any) {
    console.error(`[InfrastructureAPI] Error [${requestId}]:`, error);
    return NextResponse.json(
      { error: "Provisioning failed", message: error.message, requestId },
      { status: 500 }
    );
  }
}

// GET /api/infrastructure - Get capacity and costs
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const { searchParams } = new URL(req.url);
    const fleetId = searchParams.get("fleetId");

    if (!fleetId) {
      return NextResponse.json(
        { error: "fleetId required", requestId },
        { status: 400 }
      );
    }

    await ensureProvisioner();

    const capacity = await infrastructureProvisioner.getAvailableCapacity(fleetId);
    const cost = infrastructureProvisioner.estimateCost(fleetId);

    return NextResponse.json(
      {
        success: true,
        data: {
          capacity,
          cost,
        },
        requestId,
      },
      { headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );

  } catch (error: any) {
    console.error(`[InfrastructureAPI] Error [${requestId}]:`, error);
    return NextResponse.json(
      { error: "Failed to get infrastructure info", message: error.message, requestId },
      { status: 500 }
    );
  }
}
