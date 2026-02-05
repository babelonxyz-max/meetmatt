import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const agent = await prisma.agent.create({
      data: {
        sessionId,
        name: agentName,
        purpose,
        features: features || [],
        tier,
        status: "active",
      },
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
