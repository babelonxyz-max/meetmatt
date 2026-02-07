import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, devinApiKey } = body;

    if (!agentId || !devinApiKey) {
      return NextResponse.json({ error: "agentId and devinApiKey required" }, { status: 400 });
    }

    // Get agent details
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const config = JSON.parse(agent.features[0] || '{}');

    // Build prompt for Devin
    const prompt = `Create a Telegram bot named "${agent.name}".

Use Case: ${config.useCase || 'assistant'}
Scope: ${config.scope || 'general assistance'}
Contact Method: ${config.contactMethod || 'telegram'}

Requirements:
1. Create a Telegram bot using BotFather
2. Set up the bot with the name "${agent.name}"
3. Provide the bot username and authentication code
4. Return the bot details in this format:
   - Bot Username: @username
   - Auth Code: XXXXX
   - Telegram Link: https://t.me/username

The bot should handle: ${config.scope || 'general assistance'}`;

    // Call Devin API directly
    const response = await fetch("https://api.devin.ai/v1/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${devinApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        name: `Deploy ${agent.name}`,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json(
        { error: `Devin API error: ${error.message || response.statusText}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Update agent with new Devin session
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        devinSessionId: data.session_id,
        devinUrl: data.url,
        status: "deploying",
      },
    });

    return NextResponse.json({
      success: true,
      devinSessionId: data.session_id,
      devinUrl: data.url,
      agent: {
        id: agent.id,
        name: agent.name,
        status: "deploying",
      },
    });

  } catch (error: any) {
    console.error("[CreateDevinSession] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Devin session" },
      { status: 500 }
    );
  }
}
