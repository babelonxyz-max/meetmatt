import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDevinSession } from "@/lib/devin";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    // Allow internal webhook secret OR authenticated user
    const internalSecret = req.headers.get("x-internal-secret");
    const isInternalCall = internalSecret && internalSecret === process.env.INTERNAL_WEBHOOK_SECRET;

    if (!isInternalCall) {
      const { userId } = await requireAuth(req);
      const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { userId: true } });
      if (!agent || agent.userId !== userId) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.status !== "pending") {
      return NextResponse.json({ error: "Agent already processed" }, { status: 400 });
    }

    const features = JSON.parse(agent.features[0] || '{}');
    const personality = features.personality || "professional";
    const useCase = features.useCase === "fleet" ? "fleet" : "assistant";

    const devinSession = await createDevinSession({
      name: agent.name,
      useCase,
      scope: personality,
      contactMethod: "telegram",
    });

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        devinSessionId: devinSession.sessionId,
        devinUrl: devinSession.url,
        status: "deploying",
        activationStatus: "activating",
      },
    });

    console.log("[TriggerDeploy] Devin session created:", devinSession.sessionId);

    return NextResponse.json({
      success: true,
      devinSessionId: devinSession.sessionId,
      devinUrl: devinSession.url,
    });

  } catch (error: any) {
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[TriggerDeploy] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
