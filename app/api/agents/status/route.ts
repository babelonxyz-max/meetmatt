import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Verify ownership
    if (agent.userId !== userId) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      activationStatus: agent.activationStatus,
      devinUrl: agent.devinUrl,
      botUsername: agent.botUsername,
      telegramLink: agent.telegramLink,
      authCode: agent.authCode,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    });

  } catch (error: any) {
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Agent/Status] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
