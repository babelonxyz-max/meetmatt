import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDevinSession, pollForCompletion } from "@/lib/devin";
import { z } from "zod";

// Validation schemas
const agentIdSchema = z.string().cuid().optional();
const sessionIdSchema = z.string().min(1).optional();

const createAgentSchema = z.object({
  agentName: z.string().min(1).max(50),
  personality: z.enum(["professional", "friendly", "hustler"]),
  userId: z.string().min(1),
});

// Rate limiting (simple in-memory)
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

// GET /api/agents?sessionId=xxx or /api/agents?id=xxx
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(req.url);
    const agentId = agentIdSchema.safeParse(searchParams.get("id"));
    const sessionId = sessionIdSchema.safeParse(searchParams.get("sessionId"));

    // Get single agent by ID
    if (agentId.success && agentId.data) {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId.data },
        include: { user: { select: { email: true } } },
      });

      if (!agent) {
        return NextResponse.json(
          { error: "Agent not found" }, 
          { status: 404, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
        );
      }

      return NextResponse.json(
        { success: true, agent },
        { headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
      );
    }

    // Get agents by session ID
    if (sessionId.success && sessionId.data) {
      const agents = await prisma.agent.findMany({
        where: { sessionId: sessionId.data },
        orderBy: { createdAt: "desc" },
        take: 100, // Limit results
      });

      return NextResponse.json(
        { success: true, agents, count: agents.length },
        { headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
      );
    }

    return NextResponse.json(
      { error: "Session ID or Agent ID required" },
      { status: 400, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  } catch (error: any) {
    console.error("[Agents/GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", requestId: crypto.randomUUID() },
      { status: 500, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  }
}

// POST /api/agents (V2)
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  // Rate limiting
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 1 minute.", requestId },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }
  
  try {
    // Parse and validate body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", requestId },
        { status: 400 }
      );
    }
    
    const validation = createAgentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: validation.error.issues,
          requestId 
        },
        { status: 400 }
      );
    }
    
    const { agentName, personality, userId: privyId } = validation.data;

    // Look up or create the user from the Privy ID
    let dbUserId: string | null = null;
    if (privyId) {
      const user = await prisma.user.upsert({
        where: { privyId },
        update: { lastLoginAt: new Date() },
        create: {
          privyId,
          lastLoginAt: new Date(),
        },
        select: { id: true },
      });
      
      dbUserId = user.id;
    }

    // Sanitize and generate unique slug
    const sanitizedName = agentName.trim().replace(/[<>\"']/g, '');
    const baseSlug = sanitizedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const sessionId = `sess_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

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

    // Trigger Devin deployment in background (don't await)
    deployAgent(agent.id, {
      name: sanitizedName,
      personality,
    }).catch(err => {
      console.error(`[Agents/POST] Background deploy failed for ${agent.id}:`, err);
    });

    return NextResponse.json(
      { 
        success: true, 
        agent: {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          status: agent.status,
          activationStatus: agent.activationStatus,
          createdAt: agent.createdAt,
        },
        requestId,
      },
      { 
        status: 201,
        headers: { 
          "X-Response-Time": `${Date.now() - startTime}ms`,
          "Location": `/api/agents?id=${agent.id}`
        } 
      }
    );
    
  } catch (error: any) {
    console.error(`[Agents/POST] Error [${requestId}]:`, error);
    
    // Check for specific Prisma errors
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Agent with this name already exists", requestId },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  }
}

/**
 * Deploy agent using Devin (V2)
 * Runs in background - don't await in request handler
 */
async function deployAgent(
  agentId: string,
  config: {
    name: string;
    personality: string;
  }
): Promise<void> {
  const deployStartTime = Date.now();
  
  try {
    console.log(`[DeployAgent] Starting deployment for ${agentId}`, config);
    
    // Create Devin session with V2 prompt
    const devinSession = await createDevinSession({
      name: config.name,
      useCase: "assistant",
      scope: config.personality,
      contactMethod: "telegram",
    });

    console.log(`[DeployAgent] Devin session created: ${devinSession.sessionId}`);

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
      const elapsed = Date.now() - deployStartTime;
      console.log(`[DeployAgent] Agent ${agentId} status: ${status} (${elapsed}ms)`);

      if (status === "completed") {
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            status: "active",
            activationStatus: "awaiting_verification",
            deployed_at: new Date(),
          },
        });
        console.log(`[DeployAgent] Agent ${agentId} completed successfully`);
      } else if (status === "error") {
        await prisma.agent.update({
          where: { id: agentId },
          data: {
            status: "error",
            activationStatus: "failed",
          },
        });
        console.error(`[DeployAgent] Agent ${agentId} deployment failed`);
      }
    });

  } catch (error: any) {
    console.error(`[DeployAgent] Failed for ${agentId}:`, error);
    
    // Update agent to failed status
    try {
      await prisma.agent.update({
        where: { id: agentId },
        data: { 
          status: "error",
          activationStatus: "failed",
        },
      });
    } catch (updateError) {
      console.error(`[DeployAgent] Failed to update error status for ${agentId}:`, updateError);
    }
    
    // Re-throw so caller knows it failed
    throw error;
  }
}

// PATCH /api/agents/:id - Update agent (for activation webhooks)
const updateAgentSchema = z.object({
  status: z.enum(["pending", "deploying", "active", "error"]).optional(),
  activationStatus: z.enum(["pending", "activating", "awaiting_verification", "active", "failed"]).optional(),
  botUsername: z.string().min(1).max(50).optional(),
  telegramLink: z.string().url().optional(),
  authCode: z.string().min(4).max(20).optional(),
  telegramUserId: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("id");

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID required", requestId },
        { status: 400 }
      );
    }

    // Validate agent ID format
    const idValidation = z.string().cuid().safeParse(agentId);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid agent ID format", requestId },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", requestId },
        { status: 400 }
      );
    }

    const validation = updateAgentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues, requestId },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if agent exists first
    const existingAgent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true }
    });

    if (!existingAgent) {
      return NextResponse.json(
        { error: "Agent not found", requestId },
        { status: 404 }
      );
    }

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.activationStatus && { activationStatus: data.activationStatus }),
        ...(data.botUsername && { botUsername: data.botUsername }),
        ...(data.telegramLink && { telegramLink: data.telegramLink }),
        ...(data.authCode && { authCode: data.authCode }),
        ...(data.telegramUserId && { telegramUserId: data.telegramUserId }),
        ...(data.activationStatus === "active" && { verifiedAt: new Date() }),
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        agent: {
          id: agent.id,
          name: agent.name,
          status: agent.status,
          activationStatus: agent.activationStatus,
          updatedAt: agent.updatedAt,
        },
        requestId,
      },
      { headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
    
  } catch (error: any) {
    console.error(`[Agents/PATCH] Error [${requestId}]:`, error);
    
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Agent not found", requestId },
        { status: 404, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500, headers: { "X-Response-Time": `${Date.now() - startTime}ms` } }
    );
  }
}
