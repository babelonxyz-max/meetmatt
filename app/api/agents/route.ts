import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { safeCompare } from "@/lib/crypto-utils";
import { sanitizeAgentName, sanitizeText } from "@/lib/sanitize";
import { getStatusError } from "@/lib/http-error";
import { OWNER_TYPE } from "@/lib/agent-blueprint";
import { createPendingCustomerAgent } from "@/lib/customer-agent-launch";

// GET /api/agents - Get authenticated user's agents
export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth(req);

    const agents = await prisma.agent.findMany({
      where: {
        ownerType: OWNER_TYPE.customer,
        OR: [
          { workspaceId },
          {
            workspaceId: null,
            userId,
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        tier: true,
        ownerType: true,
        agentKind: true,
        productUseCase: true,
        activationStatus: true,
        botUsername: true,
        telegramLink: true,
        subscriptionStatus: true,
        subscriptionType: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        deployState: true,
        transportProvider: true,
        brainProvider: true,
        deploymentProvider: true,
        runtimeProvider: true,
        runtimeUrl: true,
        useCaseTemplateId: true,
        workerTier: true,
        loadoutVersion: true,
        deployErrorCode: true,
        deployErrorMessage: true,
        devinUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ agents });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("Fetch agents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/agents - Create new agent (auth required)
export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth(req);
    const body = await req.json();
    const { agentName, personality, useCase } = body;
    const telegramBotToken =
      typeof body.telegramBotToken === "string" ? body.telegramBotToken : "";
    const normalizedUseCase = useCase === "fleet" ? "fleet" : "assistant";
    const explicitUseCaseTemplateSlug =
      typeof body.useCaseSlug === "string" && body.useCaseSlug.trim().length > 0
        ? body.useCaseSlug.trim()
        : null;

    if (!agentName || !personality) {
      return NextResponse.json({ error: "agentName and personality required" }, { status: 400 });
    }

    if (!telegramBotToken.trim()) {
      return NextResponse.json(
        { error: "telegramBotToken required until automatic bot creation is live" },
        { status: 400 },
      );
    }

    const sanitizedName = sanitizeAgentName(agentName);
    const sanitizedPersonality = sanitizeText(personality, 500);

    if (!sanitizedName || !sanitizedPersonality) {
      return NextResponse.json({ error: "agentName and personality required" }, { status: 400 });
    }

    const agent = await createPendingCustomerAgent({
      userId,
      workspaceId,
      agentName: sanitizedName,
      personality: sanitizedPersonality,
      useCase: normalizedUseCase,
      useCaseSlug: explicitUseCaseTemplateSlug,
      telegramBotToken,
      source: "api/agents",
    });

    return NextResponse.json(agent);
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("Create agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const isInternalCall = !!process.env.INTERNAL_WEBHOOK_SECRET && safeCompare(internalSecret ?? "", process.env.INTERNAL_WEBHOOK_SECRET);

    if (!isInternalCall) {
      const { userId, workspaceId } = await requireAuth(req);
      // Verify ownership
      const existing = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { workspaceId: true, userId: true },
      });
      if (
        !existing ||
        !(
          existing.workspaceId === workspaceId ||
          (!existing.workspaceId && existing.userId === userId)
        )
      ) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    const body = await req.json();

    // Whitelist fields based on caller type
    type AgentUpdatePayload = {
      status?: string;
      devinUrl?: string;
      activationStatus?: string;
      botUsername?: string;
      telegramLink?: string;
      authCode?: string;
      verifiedAt?: Date;
      telegramUserId?: string;
    };
    const updateData: AgentUpdatePayload = {};

    if (isInternalCall) {
      // Internal calls (webhooks) can set privileged fields
      const { status, devinUrl, activationStatus, botUsername, telegramLink, authCode, verifiedAt, telegramUserId } = body;
      if (status) updateData.status = status;
      if (devinUrl) updateData.devinUrl = devinUrl;
      if (activationStatus) updateData.activationStatus = activationStatus;
      if (botUsername) updateData.botUsername = botUsername;
      if (telegramLink) updateData.telegramLink = telegramLink;
      if (authCode) updateData.authCode = authCode;
      if (verifiedAt) updateData.verifiedAt = new Date(verifiedAt);
      if (telegramUserId) updateData.telegramUserId = telegramUserId;
    } else {
      // User calls can only update safe fields
      const { telegramUserId } = body;
      if (telegramUserId) updateData.telegramUserId = telegramUserId;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: updateData,
    });

    return NextResponse.json({ agent });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("Update agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
