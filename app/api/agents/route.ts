import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDevinSession, pollForCompletion } from "@/lib/devin";

// GET /api/agents?sessionId=xxx or /api/agents?id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const agentId = searchParams.get("id");

  try {
    // Get single agent by ID
    if (agentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      return NextResponse.json(agent);
    }

    // Get agents by session ID
    if (sessionId) {
      const agents = await prisma.agent.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ agents });
    }

    return NextResponse.json({ error: "Session ID or Agent ID required" }, { status: 400 });
  } catch (error: any) {
    console.error("Fetch agents error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch agents" }, { status: 500 });
  }
}

// POST /api/agents
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, agentName, useCase, scope, contactMethod, userId } = body;

    if (!sessionId || !agentName || !useCase) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate unique slug from agent name
    const baseSlug = agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    // Create agent record with activating status
    const agent = await prisma.agent.create({
      data: {
        sessionId,
        slug: uniqueSlug,
        name: agentName,
        purpose: scope || useCase,
        features: [JSON.stringify({ useCase, scope, contactMethod })],
        tier: "matt",
        status: "pending",
        userId: userId || null,
        activationStatus: "activating",
      },
    });

    // Start deployment in background (don't await)
    deployAgent(agent.id, {
      name: agentName,
      useCase,
      scope,
      contactMethod,
    });

    return NextResponse.json(agent);
  } catch (error: any) {
    console.error("Create agent error:", error);
    return NextResponse.json({ error: error.message || "Failed to create agent" }, { status: 500 });
  }
}

/**
 * Deploy agent using Devin
 */
async function deployAgent(
  agentId: string,
  config: {
    name: string;
    useCase: string;
    scope: string;
    contactMethod: string;
  }
) {
  try {
    // Create Devin session
    const devinSession = await createDevinSession({
      name: config.name,
      useCase: config.useCase,
      scope: config.scope,
      contactMethod: config.contactMethod,
    });

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
    await pollForCompletion(devinSession.sessionId, async (status) => {
      console.log(`Agent ${agentId} deployment status: ${status}`);

      if (status === "completed") {
        // When Devin completes, set to awaiting_verification
        // Devin should provide bot username and auth code via webhook or API
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            status: "active",
            activationStatus: "awaiting_verification",
          },
        });
      } else if (status === "error") {
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            status: "error",
            activationStatus: "failed",
          },
        });
      }
    });

    console.log(`Agent ${agentId} deployed successfully`);
  } catch (error) {
    console.error(`Failed to deploy agent ${agentId}:`, error);

    // Update status to error
    await prisma.agent.update({
      where: { id: agentId },
      data: { 
        status: "error",
        activationStatus: "failed",
      },
    });
  }
}

// PATCH /api/agents/:id - Update agent (for activation webhooks)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("id");

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    const body = await req.json();
    const { 
      status, 
      devinUrl, 
      activationStatus, 
      botUsername, 
      telegramLink, 
      authCode,
      verifiedAt,
      telegramUserId,
    } = body;

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(status && { status }),
        ...(devinUrl && { devinUrl }),
        ...(activationStatus && { activationStatus }),
        ...(botUsername && { botUsername }),
        ...(telegramLink && { telegramLink }),
        ...(authCode && { authCode }),
        ...(verifiedAt && { verifiedAt: new Date(verifiedAt) }),
        ...(telegramUserId && { telegramUserId }),
      },
    });

    return NextResponse.json({ agent });
  } catch (error: any) {
    console.error("Update agent error:", error);
    return NextResponse.json({ error: error.message || "Failed to update agent" }, { status: 500 });
  }
}
