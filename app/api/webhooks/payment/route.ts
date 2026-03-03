import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyIPNSignature } from "@/lib/nowpayments";

const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // Verify IPN signature
    const signature = req.headers.get("x-nowpayments-sig") || "";
    if (!verifyIPNSignature(body, signature, NOWPAYMENTS_IPN_SECRET)) {
      console.error("[Payment Webhook] Invalid IPN signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { payment_status, order_id } = body;

    console.log("[Payment Webhook] Received:", { order_id, payment_status });

    // Find payment by order_id
    const payment = await prisma.payment.findFirst({
      where: { sessionId: order_id },
    });

    if (!payment) {
      console.error("[Payment Webhook] Payment not found:", order_id);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Idempotency: skip if already processed
    if (payment.status === "confirmed" || payment.status === "failed") {
      console.log("[Payment Webhook] Already processed:", order_id, payment.status);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Update payment status
    let newStatus = payment.status;
    if (payment_status === "finished" || payment_status === "confirmed") {
      newStatus = "confirmed";
    } else if (payment_status === "failed" || payment_status === "expired") {
      newStatus = "failed";
    } else if (payment_status === "partially_paid") {
      newStatus = "partial";
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        txHash: body.payin_hash,
        confirmedAt: newStatus === "confirmed" ? new Date() : null,
      },
    });

    // If payment confirmed, trigger deployment
    if (newStatus === "confirmed") {
      // Extract agentId from order_id format: matt_{agentId}_{timestamp}
      const orderParts = order_id.split("_");
      const agentIdFromOrder = orderParts.length >= 3 ? orderParts.slice(1, -1).join("_") : null;

      let agent = null;
      if (agentIdFromOrder) {
        agent = await prisma.agent.findUnique({ where: { id: agentIdFromOrder } });
      }
      // Fallback to original behavior if order_id parsing fails
      if (!agent) {
        agent = await prisma.agent.findFirst({
          where: { userId: payment.userId, status: "pending" },
          orderBy: { createdAt: "desc" },
        });
      }

      if (agent && agent.activationStatus === "pending") {
        console.log("[Payment Webhook] Triggering deployment for agent:", agent.id);

        // Update agent status
        await prisma.agent.update({
          where: { id: agent.id },
          data: {
            activationStatus: "activating",
            lastPaymentId: payment.id,
          },
        });

        // Trigger Devin deployment
        if (!process.env.INTERNAL_WEBHOOK_SECRET) {
          console.error("[Payment Webhook] INTERNAL_WEBHOOK_SECRET not set, cannot trigger deploy");
          await prisma.agent.update({
            where: { id: agent.id },
            data: { activationStatus: "failed" },
          });
        } else {
          const triggerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agents/trigger-deploy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": process.env.INTERNAL_WEBHOOK_SECRET,
            },
            body: JSON.stringify({ agentId: agent.id }),
          });

          if (!triggerResponse.ok) {
            console.error("[Payment Webhook] Deploy trigger failed:", triggerResponse.status, await triggerResponse.text().catch(() => ""));
            await prisma.agent.update({
              where: { id: agent.id },
              data: { activationStatus: "failed" },
            });
          } else {
            console.log("[Payment Webhook] Deploy triggered successfully for agent:", agent.id);
          }
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("[Payment Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
