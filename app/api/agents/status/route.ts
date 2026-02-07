import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: {
          select: { email: true, privyId: true },
        },
      },
    });

    if (!agent) {
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
    console.error("[Agent/Status] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
