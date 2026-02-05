import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDevinSession, pollDevinSession, type DevinConfig } from "@/lib/devin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, purpose, features, tier, customerName, customerEmail, sessionId } = body;

    // Validate required fields
    if (!name || !purpose) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use default tier if not provided
    const agentTier = tier || "standard";

    // Create Devin session with the configuration
    const devinConfig: DevinConfig = {
      name,
      purpose,
      features: features || ["Chat", "AI Processing"],
      tier: agentTier,
    };

    // Create Devin session
    console.log("Creating Devin session with config:", devinConfig);
    const devinSession = await createDevinSession(devinConfig);
    
    console.log("Devin session created:", devinSession.sessionId);

    // Create agent record in database
    const agent = await prisma.agent.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        description: purpose,
        purpose,
        features: features || ["Chat", "AI Processing"],
        tier: agentTier,
        customerName: customerName || "Anonymous",
        customerEmail: customerEmail || null,
        status: "deploying",
        devinSessionId: devinSession.sessionId,
        devinUrl: devinSession.url,
        paymentSessionId: sessionId,
      },
    });

    // Start polling in the background (won't block response)
    pollDevinSessionInBackground(devinSession.sessionId, agent.id);

    return NextResponse.json({ 
      success: true, 
      agent,
      devinSession: {
        sessionId: devinSession.sessionId,
        url: devinSession.url,
      }
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Background polling function
async function pollDevinSessionInBackground(sessionId: string, agentId: string) {
  try {
    await pollDevinSession(
      sessionId,
      async (status, messages) => {
        console.log(`Agent ${agentId} status: ${status}`);
        
        // Update agent status in database
        const finalStatus = status === "completed" ? "live" : 
                           status === "error" ? "error" : "deploying";
        
        await prisma.agent.update({
          where: { id: agentId },
          data: { 
            status: finalStatus,
            deployedAt: status === "completed" ? new Date() : undefined,
          },
        });

        // Store latest messages for context if available
        if (messages && messages.length > 0) {
          // Could store messages in a separate table for history
          console.log(`Agent ${agentId} has ${messages.length} messages`);
        }
      },
      240, // Max 240 attempts (20 minutes at 5 second intervals)
      5000 // 5 second polling interval
    );
  } catch (error) {
    console.error(`Background polling failed for agent ${agentId}:`, error);
    
    // Mark agent as error
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "error" },
    });
  }
}

// GET endpoint to list agents
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const devinSessionId = searchParams.get("devinSessionId");

    let where: any = {};
    
    if (sessionId) {
      where.paymentSessionId = sessionId;
    }
    
    if (devinSessionId) {
      where.devinSessionId = devinSessionId;
    }

    const agents = await prisma.agent.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update agent status
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}
