import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/control/agents/[id]/redeploy - Trigger redeployment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Update agent status to trigger redeploy
    await prisma.agent.update({
      where: { id },
      data: {
        status: "pending",
        activationStatus: "pending",
      },
    });

    // Trigger Devin deployment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const deployUrl = `${appUrl}/api/agents/trigger-deploy`;
    
    try {
      const response = await fetch(deployUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: id }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Log activity
      await prisma.activityLog.create({
        data: {
          action: "agent_redeployed",
          entityType: "agent",
          entityId: id,
          metadata: JSON.stringify({ devinSessionId: data.devinSessionId }),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Redeployment triggered",
        devinSessionId: data.devinSessionId,
        devinUrl: data.devinUrl,
      });
    } catch (err) {
      console.error("[Control] Redeploy error:", err);
      return NextResponse.json(
        { error: "Failed to trigger redeployment" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Control] Redeploy error:", error);
    return NextResponse.json(
      { error: "Failed to redeploy agent" },
      { status: 500 }
    );
  }
}
