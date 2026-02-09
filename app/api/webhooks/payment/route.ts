import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";

// NowPayments webhook payload schema
const nowpaymentsWebhookSchema = z.object({
  payment_id: z.string(),
  payment_status: z.enum([
    "waiting", 
    "confirming", 
    "confirmed", 
    "sending", 
    "partially_paid",
    "finished", 
    "failed", 
    "refunded", 
    "expired"
  ]),
  pay_address: z.string().optional(),
  pay_amount: z.number().or(z.string()).optional(),
  actually_paid: z.number().or(z.string()).optional(),
  order_id: z.string(),
  payin_hash: z.string().optional(),
  payout_hash: z.string().optional(),
  price_amount: z.number().or(z.string()).optional(),
  price_currency: z.string().optional(),
  pay_currency: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Verify NowPayments IPN signature
 */
function verifySignature(payload: string, signature: string): boolean {
  if (!NOWPAYMENTS_IPN_SECRET) {
    console.warn("[Payment Webhook] IPN secret not configured, skipping verification");
    return true; // Allow in development
  }
  
  const hmac = crypto
    .createHmac("sha512", NOWPAYMENTS_IPN_SECRET)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(signature)
  );
}

/**
 * Parse order ID to determine payment type
 */
function parseOrderId(orderId: string): {
  type: "initial" | "extension";
  agentId: string;
  months?: number;
} {
  // Extension format: extend_{agentId}_{months}m_{timestamp}
  if (orderId.startsWith("extend_")) {
    const parts = orderId.split("_");
    // parts[0] = "extend", parts[1] = agentId, parts[2] = "3m", parts[3] = timestamp
    if (parts.length >= 3) {
      const monthsMatch = parts[2].match(/(\d+)m/);
      const months = monthsMatch ? parseInt(monthsMatch[1]) : 1;
      return { type: "extension", agentId: parts[1], months };
    }
  }
  
  // Initial payment format: matt_{agentId}_{timestamp}
  if (orderId.startsWith("matt_")) {
    const parts = orderId.split("_");
    if (parts.length >= 2) {
      return { type: "initial", agentId: parts[1] };
    }
  }
  
  return { type: "initial", agentId: "" };
}

/**
 * Generate invoice number
 */
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

/**
 * NowPayments webhook handler
 * Receives payment status updates
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig");
    
    // Verify signature
    if (signature && !verifySignature(rawBody, signature)) {
      console.error(`[Payment Webhook] Invalid signature [${requestId}]`);
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
    
    const validation = nowpaymentsWebhookSchema.safeParse(body);
    if (!validation.success) {
      console.error(`[Payment Webhook] Validation failed [${requestId}]:`, validation.error.issues);
      return NextResponse.json(
        { error: "Invalid payload", details: validation.error.issues, requestId },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    console.log(`[Payment Webhook] Received [${requestId}]:`, { 
      order_id: data.order_id, 
      payment_status: data.payment_status,
      payment_id: data.payment_id 
    });

    // Find payment by order_id
    const payment = await prisma.payment.findFirst({
      where: { sessionId: data.order_id },
    });

    if (!payment) {
      console.error(`[Payment Webhook] Payment not found [${requestId}]:`, data.order_id);
      return NextResponse.json(
        { error: "Payment not found", requestId },
        { status: 404 }
      );
    }

    // Idempotency: Don't process if already confirmed
    if (payment.status === "confirmed") {
      console.log(`[Payment Webhook] Already confirmed [${requestId}]:`, payment.id);
      return NextResponse.json({ success: true, status: "already_confirmed", requestId });
    }

    // Map NowPayments status to our status
    const statusMap: Record<string, string> = {
      "finished": "confirmed",
      "confirmed": "confirmed",
      "sending": "confirmed",
      "failed": "failed",
      "expired": "expired",
      "refunded": "refunded",
      "partially_paid": "partial",
      "waiting": "pending",
      "confirming": "confirming",
    };
    
    const newStatus = statusMap[data.payment_status] || "pending";

    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        txHash: data.payin_hash,
        confirmedAt: newStatus === "confirmed" ? new Date() : null,
      },
    });

    console.log(`[Payment Webhook] Updated [${requestId}]:`, { 
      paymentId: payment.id, 
      newStatus 
    });

    // If payment confirmed, process based on type
    if (newStatus === "confirmed" && payment.userId) {
      const orderInfo = parseOrderId(data.order_id);
      
      // Create invoice record
      await createInvoice(payment.id, data.order_id, requestId);
      
      if (orderInfo.type === "extension") {
        // Handle subscription extension
        await handleSubscriptionExtension(
          orderInfo.agentId, 
          payment.id, 
          orderInfo.months || 1, 
          requestId
        );
      } else {
        // Handle initial deployment
        await triggerDeployment(payment.userId, payment.id, requestId);
      }
    }

    return NextResponse.json({ 
      success: true, 
      status: newStatus,
      requestId,
      processingTime: Date.now() - startTime 
    });

  } catch (error: any) {
    console.error(`[Payment Webhook] Error [${requestId}]:`, error);
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500 }
    );
  }
}

/**
 * Create invoice record for confirmed payment
 */
async function createInvoice(paymentId: string, orderId: string, requestId: string) {
  try {
    const invoiceNumber = generateInvoiceNumber();
    
    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: { paymentId },
    });
    
    if (existingInvoice) {
      console.log(`[Payment Webhook] Invoice already exists [${requestId}]:`, existingInvoice.id);
      return;
    }
    
    await prisma.invoice.create({
      data: {
        paymentId,
        invoiceNumber,
        status: "paid",
      },
    });
    
    console.log(`[Payment Webhook] Invoice created [${requestId}]:`, invoiceNumber);
  } catch (error) {
    console.error(`[Payment Webhook] Failed to create invoice [${requestId}]:`, error);
    // Don't throw - invoice creation shouldn't break payment flow
  }
}

/**
 * Handle subscription extension payment
 */
async function handleSubscriptionExtension(
  agentId: string, 
  paymentId: string, 
  months: number,
  requestId: string
) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      console.error(`[Payment Webhook] Agent not found for extension [${requestId}]:`, agentId);
      return;
    }

    // Calculate new period end
    const currentEnd = agent.currentPeriodEnd ? new Date(agent.currentPeriodEnd) : new Date();
    const newPeriodEnd = new Date(currentEnd);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + months);

    // Update agent subscription
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        subscriptionStatus: "active",
        currentPeriodEnd: newPeriodEnd,
        lastPaymentId: paymentId,
        cancelAtPeriodEnd: false,
      },
    });

    console.log(`[Payment Webhook] Subscription extended [${requestId}]:`, {
      agentId,
      months,
      newPeriodEnd: newPeriodEnd.toISOString(),
    });

    // Log activity
    await logActivity("subscription_extended", "agent", agentId, null, {
      months,
      paymentId,
      newPeriodEnd: newPeriodEnd.toISOString(),
    });

  } catch (error) {
    console.error(`[Payment Webhook] Extension failed [${requestId}]:`, error);
    throw error;
  }
}

/**
 * Trigger deployment for paid agent
 */
async function triggerDeployment(userId: string, paymentId: string, requestId: string) {
  try {
    // Find the most recent pending agent for this user
    const agent = await prisma.agent.findFirst({
      where: { 
        userId: userId, 
        status: "pending",
        activationStatus: "pending",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!agent) {
      console.warn(`[Payment Webhook] No pending agent found [${requestId}] for user:`, userId);
      return;
    }

    console.log(`[Payment Webhook] Triggering deployment [${requestId}]:`, agent.id);
    
    // Calculate subscription period
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // Default 1 month for initial payment

    // Update agent status and subscription
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        activationStatus: "activating",
        lastPaymentId: paymentId,
        subscriptionStatus: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // Log activity
    await logActivity("deployment_triggered", "agent", agent.id, null, {
      paymentId,
      userId,
    });

    // Trigger Devin deployment with retry logic
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const deployUrl = `${appUrl}/api/agents/trigger-deploy`;
    
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch(deployUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agent.id }),
        });
        
        if (response.ok) {
          console.log(`[Payment Webhook] Deployment triggered [${requestId}]:`, agent.id);
          break;
        }
        
        throw new Error(`HTTP ${response.status}`);
      } catch (err) {
        retries--;
        if (retries === 0) {
          console.error(`[Payment Webhook] Failed to trigger deployment [${requestId}]:`, err);
          // Update agent to failed state
          await prisma.agent.update({
            where: { id: agent.id },
            data: {
              status: "error",
              activationStatus: "failed",
            },
          });
          
          // Log failure
          await logActivity("deployment_failed", "agent", agent.id, null, {
            paymentId,
            error: String(err),
          });
        } else {
          // Wait before retry
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  } catch (error) {
    console.error(`[Payment Webhook] triggerDeployment error [${requestId}]:`, error);
  }
}

/**
 * Log activity for audit trail
 */
async function logActivity(
  action: string,
  entityType: string,
  entityId: string,
  actorId: string | null,
  metadata?: any
) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entityType,
        entityId,
        actorId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error("[Activity Log] Failed to log:", error);
    // Don't throw - logging shouldn't break main flow
  }
}
