/**
 * Fleet API - Visual/Placeholder Version
 * 
 * This is a mock implementation for visual deployment.
 * Replace with full implementation after setting up Redis + infrastructure.
 */

import { NextRequest, NextResponse } from "next/server";

const MOCK_FLEETS = [
  {
    id: "fleet-demo-1",
    name: "Demo Support Fleet",
    description: "Customer support agents",
    slug: "demo-support-fleet",
    status: "running",
    progress: {
      totalAgents: 50,
      deployedAgents: 50,
      failedAgents: 0,
      pendingAgents: 0,
    },
    config: {
      targetAgentCount: 50,
      provider: "openclaw",
      agentTemplate: {
        namePrefix: "support-bot",
        personality: "professional",
      },
    },
    createdAt: new Date().toISOString(),
  },
];

// GET /api/fleet - List fleets (MOCK)
export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      fleets: MOCK_FLEETS,
      total: MOCK_FLEETS.length,
      page: 1,
      pageSize: 10,
    },
  });
}

// POST /api/fleet - Create fleet (MOCK)
export async function POST(req: NextRequest) {
  const body = await req.json();
  
  const newFleet = {
    id: `fleet-${Date.now()}`,
    name: body.name,
    description: body.description,
    slug: `fleet-${Date.now()}`,
    status: "draft",
    progress: {
      totalAgents: body.config?.targetAgentCount || 10,
      deployedAgents: 0,
      failedAgents: 0,
      pendingAgents: body.config?.targetAgentCount || 10,
    },
    config: body.config,
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    data: {
      fleetId: newFleet.id,
      status: "draft",
      message: "Fleet created (DEMO MODE - Infrastructure not configured)",
      progress: newFleet.progress,
    },
  }, { status: 201 });
}
