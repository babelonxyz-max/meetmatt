import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const DEVIN_WEBHOOK_SECRET = process.env.DEVIN_WEBHOOK_SECRET || "";

// Devin webhook payload schema
const devinWebhookSchema = z.object({
  session_id: z.string(),
  status: z.enum(["pending", "running", "completed", "error", "cancelled"]),
  output: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string().optional(),
});

/**
 * Verify Devin webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
  if (!DEVIN_WEBHOOK_SECRET) {
    console.warn("[Devin Webhook] Secret not configured, skipping verification");
    return true;
  }
  
  const hmac = crypto
    .createHmac("sha256", DEVIN_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(signature)
  );
}

/**
 * Extract bot details from Devin output
 */
function parseDevinOutput(output: string): {
  botUsername?: string;
  authCode?: string;
  telegramLink?: string;
} {
  const result: { botUsername?: string; authCode?: string; telegramLink?: string } = {};
  
  if (!output) return result;
  
  // Try various regex patterns
  const usernameMatch = output.match(/Bot Username[:\s]+@?(\w+)/i);
  if (usernameMatch) result.botUsername = usernameMatch[1];
  
  const authCodeMatch = output.match(/Auth Code[:\s]+([A-Z0-9]+)/i);
  if (authCodeMatch) result.authCode = authCodeMatch[1];
  
  const linkMatch = output.match(/Telegram Link[:\s]+(https:\/\/t\.me\/\w+)/i);
  if (linkMatch) result.telegramLink = linkMatch[1];
  
  return result;
}

/**
 * Devin webhook handler
 * Called when Devin session completes
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-devin-signature");
    
    // Verify signature
    if (signature && !verifySignature(rawBody, signature)) {
      console.error(`[Devin Webhook] Invalid signature [${requestId}]`);
      return NextResponse.json(
        { error: "Invalid signature", requestId },
        { status: 401 }
      );
    }
    
    // Parse and validate body
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", requestId },
        { status: 400 }
      );
    }
    
    const validation = devinWebhookSchema.safeParse(body);
    if (!validation.success) {
      console.error(`[Devin Webhook] Validation failed [${requestId}]:`, validation.error.issues);
      return NextResponse.json(
        { error: "Invalid payload", details: validation.error.issues, requestId },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    console.log(`[Devin Webhook] Received [${requestId}]:`, { 
      session_id: data.session_id, 
      status: data.status 
    });

    // Find agent by Devin session ID
    const agent = await prisma.agent.findFirst({
      where: { devinSessionId: data.session_id },
    });

    if (!agent) {
      console.error(`[Devin Webhook] Agent not found [${requestId}]:`, data.session_id);
      return NextResponse.json(
        { error: "Agent not found", requestId },
        { status: 404 }
      );
    }

    // Idempotency: Don't reprocess completed agents
    if (agent.status === "active" || agent.status === "error") {
      console.log(`[Devin Webhook] Already processed [${requestId}]:`, agent.id);
      return NextResponse.json({ 
        success: true, 
        status: "already_processed", 
        requestId 
      });
    }

    if (data.status === "completed") {
      // Parse Devin output for bot details
      const botDetails = parseDevinOutput(data.output || "");
      
      console.log(`[Devin Webhook] Parsed details [${requestId}]:`, botDetails);

      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: "active",
          activationStatus: "awaiting_verification",
          botUsername: botDetails.botUsername,
          telegramLink: botDetails.telegramLink || `https://t.me/${botDetails.botUsername}`,
          authCode: botDetails.authCode,
          deployed_at: new Date(),
        },
      });

      console.log(`[Devin Webhook] Agent activated [${requestId}]:`, agent.id);
      
      // TODO: Send notification to user (email, push, etc.)
      // await notifyUser(agent.userId, agent.id);

    } else if (data.status === "error" || data.status === "cancelled") {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status: "error",
          activationStatus: "failed",
        },
      });

      console.error(`[Devin Webhook] Deployment failed [${requestId}]:`, {
        agentId: agent.id,
        error: data.error,
      });
      
      // TODO: Notify user of failure
      // await notifyUserOfFailure(agent.userId, agent.id, data.error);
    }

    return NextResponse.json({ 
      success: true, 
      requestId,
      processingTime: Date.now() - startTime 
    });

  } catch (error: any) {
    console.error(`[Devin Webhook] Error [${requestId}]:`, error);
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
  }
}
