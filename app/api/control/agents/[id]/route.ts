import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/control/agents/[id] - Get agent details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get payment history for this agent
    const payments = await prisma.payment.findMany({
      where: { 
        OR: [
          { userId: agent.userId },
          { sessionId: { contains: id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Get related invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        paymentId: { in: payments.map(p => p.id) },
      },
    });

    return NextResponse.json({
      agent,
      payments,
      invoices,
    });
  } catch (error: any) {
    console.error("[Control] Get agent error:", error);
    return NextResponse.json(
      { error: "Failed to get agent" },
      { status: 500 }
    );
  }
}

// PATCH /api/control/agents/[id] - Update agent
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      name, 
      purpose, 
      description, 
      tier,
      status,
      activationStatus,
      subscriptionStatus,
      currentPeriodEnd,
      botUsername,
      telegramLink,
    } = body;

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(purpose !== undefined && { purpose }),
        ...(description !== undefined && { description }),
        ...(tier !== undefined && { tier }),
        ...(status !== undefined && { status }),
        ...(activationStatus !== undefined && { activationStatus }),
        ...(subscriptionStatus !== undefined && { subscriptionStatus }),
        ...(currentPeriodEnd !== undefined && { currentPeriodEnd: new Date(currentPeriodEnd) }),
        ...(botUsername !== undefined && { botUsername }),
        ...(telegramLink !== undefined && { telegramLink }),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "agent_updated",
        entityType: "agent",
        entityId: id,
        metadata: JSON.stringify({ updatedFields: Object.keys(body) }),
      },
    });

    return NextResponse.json({ agent });
  } catch (error: any) {
    console.error("[Control] Update agent error:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

// DELETE /api/control/agents/[id] - Delete agent
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.agent.delete({
      where: { id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "agent_deleted",
        entityType: "agent",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Control] Delete agent error:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}
