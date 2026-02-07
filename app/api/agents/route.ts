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

// POST /api/agents (V2)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentName, personality, userId: privyId } = body;

    if (!agentName || !personality) {
      return NextResponse.json({ error: "agentName and personality required" }, { status: 400 });
    }

    // Look up or create the user from the Privy ID
    let dbUserId: string | null = null;
    if (privyId) {
      let user = await prisma.user.findUnique({
        where: { privyId },
        select: { id: true },
      });
      
      if (!user) {
        user = await prisma.user.create({
          data: {
            privyId,
            lastLoginAt: new Date(),
          },
          select: { id: true },
        });
      }
      
      dbUserId = user.id;
    }

    // Generate unique slug from agent name
    const baseSlug = agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    // Create agent record
    const agent = await prisma.agent.create({
      data: {
        sessionId,
        slug: uniqueSlug,
        name: agentName,
        purpose: personality,
        features: [JSON.stringify({ personality, useCase: "assistant" })],
        tier: "matt",
        status: "pending",
        userId: dbUserId,
        activationStatus: "activating",
      },
    });

    // Trigger Devin deployment in background
    deployAgent(agent.id, {
      name: agentName,
      personality,
    });

    return NextResponse.json(agent);
  } catch (error: any) {
    console.error("Create agent error:", error);
    return NextResponse.json({ error: error.message || "Failed to create agent" }, { status: 500 });
  }
}

/**
 * Deploy agent using Devin (V2)
 */
async function deployAgent(
  agentId: string,
  config: {
    name: string;
    personality: string;
  }
) {
  try {
    // Create Devin session with V2 prompt
    const devinSession = await createDevinSession({
      name: config.name,
      useCase: "assistant",
      scope: config.personality,
      contactMethod: "telegram",
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

    // Poll for completion (backup in case webhook fails)
    pollForCompletion(devinSession.sessionId, async (status) => {
      console.log(`Agent ${agentId} deployment status: ${status}`);

      if (status === "completed") {
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

    console.log(`Agent ${agentId} Devin session created:`, devinSession.sessionId);
  } catch (error) {
    console.error(`Failed to deploy agent ${agentId}:`, error);
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
