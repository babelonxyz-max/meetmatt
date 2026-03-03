import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyIPNSignature } from "@/lib/nowpayments";
import { getErrorMessage } from "@/lib/http-error";
import { activateSubscription } from "@/lib/subscription";
import { sendEmail, paymentConfirmedEmail, deploymentFailedEmail } from "@/lib/email";

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

    // If payment confirmed, trigger deployment
    if (newStatus === "confirmed") {
      // Extract agentId from order_id format: matt_{agentId}_{timestamp}
      const orderParts = orderId.split("_");
      const agentIdFromOrder = orderParts.length >= 3 ? orderParts.slice(1, -1).join("_") : null;

      if (!agentIdFromOrder) {
        console.error("[Payment Webhook] Cannot parse agentId from order_id:", orderId);
        return NextResponse.json({ success: true, warning: "Could not determine agent" });
      }

      const agent = await prisma.agent.findUnique({ where: { id: agentIdFromOrder } });
      if (!agent) {
        console.error("[Payment Webhook] Agent not found:", agentIdFromOrder);
        return NextResponse.json({ success: true, warning: "Agent not found" });
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
          const triggerUrl = new URL("/api/agents/trigger-deploy", req.url).toString();
          const triggerResponse = await fetch(triggerUrl, {
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

            // Send deployment failed email
            const failedUser = await prisma.user.findUnique({ where: { id: payment.userId ?? undefined } });
            if (failedUser?.email) {
              const { subject, html } = deploymentFailedEmail(agent.name);
              await sendEmail(failedUser.email, subject, html).catch((e: unknown) => {
                console.error("[Payment Webhook] Failed to send deployment-failed email:", e);
              });
            }
          } else {
            console.log("[Payment Webhook] Deploy triggered successfully for agent:", agent.id);

            // Activate subscription
            const subData = activateSubscription("monthly");
            await prisma.agent.update({
              where: { id: agent.id },
              data: subData,
            });
            console.log("[Payment Webhook] Subscription activated for agent:", agent.id);

            // Send payment confirmation email
            const user = await prisma.user.findUnique({ where: { id: payment.userId ?? undefined } });
            if (user?.email) {
              const { subject, html } = paymentConfirmedEmail(agent.name, payment.amount);
              await sendEmail(user.email, subject, html).catch((e: unknown) => {
                console.error("[Payment Webhook] Failed to send confirmation email:", e);
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error("[Payment Webhook] Error:", error);
    return NextResponse.json({ error: getErrorMessage(error, "Internal server error") }, { status: 500 });
  }
}
