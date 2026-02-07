import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    // Verify IPN signature (in production, validate properly)
    const body = await req.json();
    
    const {
      payment_id,
      payment_status,
      pay_address,
      pay_amount,
      actually_paid,
      order_id,
    } = body;

    console.log("[Payment Webhook] Received:", { order_id, payment_status });

    // Find payment by order_id
    const payment = await prisma.payment.findFirst({
      where: { sessionId: order_id },
    });

    if (!payment) {
      console.error("[Payment Webhook] Payment not found:", order_id);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
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
      // Find the agent and trigger deployment
      const agent = await prisma.agent.findFirst({
        where: { userId: payment.userId, status: "pending" },
        orderBy: { createdAt: "desc" },
      });

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
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agents/trigger-deploy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agent.id }),
        });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("[Payment Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
