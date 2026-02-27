/**
 * Fleet Detail API - Visual/Placeholder Version
 */

import { NextRequest, NextResponse } from "next/server";

const MOCK_AGENTS = Array.from({ length: 50 }, (_, i) => ({
  id: `agent-${i + 1}`,
  name: `support-bot-${(i + 1).toString().padStart(4, "0")}`,
  instanceNumber: i + 1,
  status: i < 45 ? "running" : i < 48 ? "pending" : "error",
  runtime: {
    provider: "openclaw",
    endpoint: `http://localhost:18789/agents/${i + 1}`,
  },
  health: {
    isHealthy: i < 45,
    latency: Math.floor(Math.random() * 100) + 20,
    lastCheckAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
}));

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const fleet = {
    id: (await params).id,
    name: "Demo Support Fleet",
    description: "Customer support agents",
    status: "running",
    progress: {
      totalAgents: 50,
      deployedAgents: 45,
      failedAgents: 2,
      pendingAgents: 3,
    },
    config: {
      targetAgentCount: 50,
      batchSize: 10,
      concurrencyLimit: 5,
      provider: "openclaw",
      agentTemplate: {
        namePrefix: "support-bot",
        personality: "professional",
        useCase: "customer support",
      },
    },
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    data: {
      ...fleet,
      agents: MOCK_AGENTS,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({
    success: true,
    message: "Fleet terminated (DEMO MODE)",
  });
}
