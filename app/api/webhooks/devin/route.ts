import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Devin webhook - called when Devin session completes
 */
export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const secret = req.headers.get("x-devin-webhook-secret");
    if (secret !== process.env.DEVIN_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      session_id, 
      status, 
      output,
      error 
    } = body;

    console.log("[Devin Webhook] Received:", { session_id, status });

    // Find agent by Devin session ID
    const agent = await prisma.agent.findFirst({
      where: { devinSessionId: session_id },
    });

    if (!agent) {
      console.error("[Devin Webhook] Agent not found for session:", session_id);
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (status === "completed") {
      // Parse Devin output for bot details
      // Expected format from Devin:
      // - Bot Username: @botname
      // - Auth Code: XXXXX
      // - Telegram Link: https://t.me/botname
      
      const botUsername = extractFromOutput(output, "Bot Username");
      const authCode = extractFromOutput(output, "Auth Code");
      const telegramLink = extractFromOutput(output, "Telegram Link");

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: "active",
          activationStatus: "awaiting_verification",
          botUsername: botUsername?.replace("@", ""),
          telegramLink: telegramLink,
          authCode: authCode,
        },
      });

      console.log("[Devin Webhook] Agent updated:", agent.id);

      // TODO: Send notification to user (email, dashboard)

      return NextResponse.json({ success: true });
    }

    if (status === "failed" || status === "error") {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: "error",
          activationStatus: "failed",
        },
      });

      console.error("[Devin Webhook] Deployment failed:", error);

      return NextResponse.json({ success: true, error: error });
    }

    return NextResponse.json({ success: true, status: "ignored" });

  } catch (err: any) {
    console.error("[Devin Webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function extractFromOutput(output: string, key: string): string | null {
  const regex = new RegExp(`${key}[:\s]+(.+)`, "i");
  const match = output.match(regex);
  return match ? match[1].trim() : null;
}
