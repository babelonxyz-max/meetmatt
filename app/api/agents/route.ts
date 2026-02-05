import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDevinSession, pollForCompletion } from "@/lib/devin";

// GET /api/agents?sessionId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID required" },
      { status: 400 }
    );
  }

  try {
    const agents = await prisma.agent.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ agents });
  } catch (error: any) {
    console.error("Fetch agents error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// POST /api/agents
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, agentName, purpose, features, tier } = body;

    if (!sessionId || !agentName || !purpose || !tier) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create agent record with pending status
    const agent = await prisma.agent.create({
      data: {
        sessionId,
        name: agentName,
        purpose,
        features: JSON.stringify(features || []),
        tier,
        status: "pending",
      },
    });

    // Start deployment in background (don't await)
    deployAgent(agent.id, {
      name: agentName,
      purpose,
      features: features || [],
      tier,
    });

    return NextResponse.json({ agent });
  } catch (error: any) {
    console.error("Create agent error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create agent" },
      { status: 500 }
    );
  }
}

/**
 * Deploy agent using Devin
 */
async function deployAgent(agentId: string, config: {
  name: string;
  purpose: string;
  features: string[];
  tier: string;
}) {
  try {
    // Update status to deploying
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "deploying" },
    });

    // Create Devin session
    const devinSession = await createDevinSession(config);

    // Update agent with Devin session info
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        devinSessionId: devinSession.sessionId,
        devinUrl: devinSession.url,
        status: "deploying",
      },
    });

    // Poll for completion
    await pollForCompletion(
      devinSession.sessionId,
      async (status) => {
        console.log(`Agent ${agentId} deployment status: ${status}`);
        
        // Update status in database
        await prisma.agent.update({
          where: { id: agentId },
          data: { 
            status: status === "completed" ? "active" : status,
          },
        });
      }
    );

    // Final update
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "active" },
    });

    console.log(`Agent ${agentId} deployed successfully`);
  } catch (error) {
    console.error(`Failed to deploy agent ${agentId}:`, error);
    
    // Update status to error
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "error" },
    });
  }
}

// PATCH /api/agents/:id - Update agent status (for webhooks)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("id");
    
    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, devinUrl } = body;

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: { 
        status,
        ...(devinUrl && { devinUrl }),
      },
    });

    return NextResponse.json({ agent });
  } catch (error: any) {
    console.error("Update agent error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update agent" },
      { status: 500 }
    );
  }
}
