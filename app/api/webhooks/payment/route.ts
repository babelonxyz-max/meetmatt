import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyIPNSignature } from "@/lib/nowpayments";
import { getErrorMessage } from "@/lib/http-error";
import { fulfillConfirmedPayment } from "@/lib/payment-fulfillment";

const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    // Verify IPN signature
    const signature = req.headers.get("x-nowpayments-sig") || "";
    if (!verifyIPNSignature(body, signature, NOWPAYMENTS_IPN_SECRET)) {
      console.error("[Payment Webhook] Invalid IPN signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const paymentStatus = typeof body.payment_status === "string" ? body.payment_status : "";
    const orderId = typeof body.order_id === "string" ? body.order_id : "";
    const payinHash = typeof body.payin_hash === "string" ? body.payin_hash : null;

    if (!orderId) {
      return NextResponse.json({ error: "Invalid webhook payload: missing order_id" }, { status: 400 });
    }

    console.log("[Payment Webhook] Received:", { order_id: orderId, payment_status: paymentStatus });

    // Find payment by order_id
    const payment = await prisma.payment.findFirst({
      where: { sessionId: orderId },
    });

    if (!payment) {
      console.error("[Payment Webhook] Payment not found:", orderId);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Idempotency: skip if already processed
    if (payment.status === "confirmed" || payment.status === "failed") {
      console.log("[Payment Webhook] Already processed:", orderId, payment.status);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Update payment status
    let newStatus = payment.status;
    if (paymentStatus === "finished" || paymentStatus === "confirmed") {
      newStatus = "confirmed";
    } else if (paymentStatus === "failed" || paymentStatus === "expired") {
      newStatus = "failed";
    } else if (paymentStatus === "partially_paid") {
      newStatus = "partial";
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        txHash: payinHash,
        confirmedAt: newStatus === "confirmed" ? new Date() : null,
      },
    });

    // If payment confirmed, trigger provisioning/deployment
    if (newStatus === "confirmed") {
      const result = await fulfillConfirmedPayment({
        payment: {
          ...payment,
          status: newStatus,
          txHash: payinHash,
          confirmedAt: newStatus === "confirmed" ? new Date() : payment.confirmedAt,
        },
        requestUrl: req.url,
        logPrefix: "[Payment Webhook]",
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error("[Payment Webhook] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Internal server error") }, { status: 500 });
  }
}
