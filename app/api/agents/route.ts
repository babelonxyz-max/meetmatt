import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/agents - Get authenticated user's agents
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);

    const agents = await prisma.agent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ agents });
  } catch (error: any) {
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Fetch agents error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch agents" }, { status: 500 });
  }
}

// POST /api/agents - Create new agent (auth required)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);
    const body = await req.json();
    const { agentName, personality, useCase } = body;
    const normalizedUseCase = useCase === "fleet" ? "fleet" : "assistant";

    if (!agentName || !personality) {
      return NextResponse.json({ error: "agentName and personality required" }, { status: 400 });
    }

    // Generate unique slug from agent name
    const baseSlug = agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    // Create agent with pending status — deployment triggers from payment webhook
    const agent = await prisma.agent.create({
      data: {
        sessionId,
        slug: uniqueSlug,
        name: agentName,
        purpose: personality,
        features: [JSON.stringify({ personality, useCase: normalizedUseCase })],
        tier: "matt",
        status: "pending",
        userId,
        activationStatus: "pending",
      },
    });

    return NextResponse.json(agent);
  } catch (error: any) {
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Create agent error:", error);
    return NextResponse.json({ error: error.message || "Failed to create agent" }, { status: 500 });
  }
}

// PATCH /api/agents?id=xxx - Update agent (auth required, or internal webhook secret)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("id");

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }

    // Allow internal webhook secret bypass (for payment/devin webhooks)
    const internalSecret = req.headers.get("x-internal-secret");
    const isInternalCall = internalSecret && internalSecret === process.env.INTERNAL_WEBHOOK_SECRET;

    if (!isInternalCall) {
      const { userId } = await requireAuth(req);
      // Verify ownership
      const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { userId: true } });
      if (!agent || agent.userId !== userId) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
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
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Update agent error:", error);
    return NextResponse.json({ error: error.message || "Failed to update agent" }, { status: 500 });
  }
}
