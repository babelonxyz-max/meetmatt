import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDevinSession } from "@/lib/devin";

const ADMIN_TOKEN = process.env.ADMIN_AUTH_TOKEN || "admin-secret-token";

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return !!authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`;
}

// POST /api/admin/create-agent - Manually create agent for user
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, agentName, useCase, scope, contactMethod } = body;

    if (!userId || !agentName) {
      return NextResponse.json(
        { error: "userId and agentName required" },
        { status: 400 }
      );
    }

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create agent in database
    const agent = await prisma.agent.create({
      data: {
        name: agentName,
        purpose: useCase || "Custom agent",
        description: scope || "General purpose",
        tier: "pro",
        userId: userId,
        status: "pending",
        slug: agentName.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
        subscriptionStatus: "active",
        subscriptionType: "monthly",
      }
    });

    // Start Devin session
    const devinSession = await createDevinSession({
      name: agentName,
      useCase: useCase || "Custom agent",
      scope: scope || "General purpose",
      contactMethod: contactMethod || "telegram",
    });

    // Update agent with Devin session
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        devinSessionId: devinSession.sessionId,
        devinUrl: devinSession.url,
        status: devinSession.status,
      }
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        status: devinSession.status,
        devinUrl: devinSession.url,
        devinSessionId: devinSession.sessionId,
      }
    });
  } catch (error: any) {
    console.error("Admin create agent error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
