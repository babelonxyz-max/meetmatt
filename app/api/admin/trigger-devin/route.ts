import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_TOKEN = process.env.ADMIN_AUTH_TOKEN || "ddec17a6bb0809ae085b65653292cf5bbf7a02eabb1d86f671b44f8d16fef7c4";

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return !!authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`;
}

// POST /api/admin/trigger-devin - Manually trigger Devin for an agent
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    // Get agent details
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Return info for manual Devin creation
    return NextResponse.json({
      success: true,
      message: "Create Devin session manually with this info:",
      agent: {
        id: agent.id,
        name: agent.name,
        purpose: agent.purpose,
        features: agent.features,
      },
      devinPrompt: `Create an AI agent named "${agent.name}" with the following specifications:

**Use Case:** ${agent.purpose}
**Features:** ${JSON.stringify(agent.features)}

Please:
1. Set up the project structure
2. Implement the core functionality
3. Add Telegram integration for communication
4. Create documentation
5. Deploy to a working endpoint

Return the deployed URL and any setup instructions.`,
      nextStep: "Go to https://preview.devin.ai and create a session with the prompt above",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
