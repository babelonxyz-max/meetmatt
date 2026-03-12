import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/http-error";
import {
  extractDodoPaymentReferences,
  inferPaymentStatusFromDodoEvent,
  verifyDodoWebhook,
} from "@/lib/dodo-payments";
import { fulfillConfirmedPayment } from "@/lib/payment-fulfillment";
import {
  isSeshAdminConfigured,
  verifyWorkspaceDodoWebhookViaSesh,
} from "@/lib/sesh";
import { ensurePersonalWorkspaceForUser } from "@/lib/workspaces";

const DODO_PAYMENTS_WEBHOOK_SECRET =
  process.env.DODO_PAYMENTS_WEBHOOK_SECRET || "";

function getWebhookHeaders(headers: Headers): Record<string, string> {
  return {
    "webhook-id": headers.get("webhook-id") || "",
    "webhook-timestamp": headers.get("webhook-timestamp") || "",
    "webhook-signature": headers.get("webhook-signature") || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let event: Record<string, unknown> | null = null;

    if (isSeshAdminConfigured()) {
      const unverifiedEvent = JSON.parse(rawBody) as Record<string, unknown>;
      const tentativeRefs = extractDodoPaymentReferences(unverifiedEvent);
      const candidatePayment =
        tentativeRefs.paymentSessionId || tentativeRefs.externalPaymentId
          ? await prisma.payment.findFirst({
              where: {
                provider: "dodo",
                OR: [
                  ...(tentativeRefs.externalPaymentId
                    ? [{ externalPaymentId: tentativeRefs.externalPaymentId }]
                    : []),
                  ...(tentativeRefs.paymentSessionId
                    ? [{ sessionId: tentativeRefs.paymentSessionId }]
                    : []),
                ],
              },
            })
          : null;

      let workspaceId = candidatePayment?.workspaceId ?? null;
      if (!workspaceId && candidatePayment?.userId) {
        workspaceId = (
          await ensurePersonalWorkspaceForUser(candidatePayment.userId)
        ).workspaceId;
      }

      if (workspaceId) {
        const verified = await verifyWorkspaceDodoWebhookViaSesh({
          workspaceId,
          payload: rawBody,
          headers: getWebhookHeaders(req.headers),
        });

        if (!verified.verified) {
          console.error("[Dodo Webhook] Invalid signature via SESH", verified.error);
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        event = verified.event || null;
      }
    }

    if (!event) {
      if (!DODO_PAYMENTS_WEBHOOK_SECRET) {
        console.error("[Dodo Webhook] No SESH mapping or direct webhook secret configured");
        return NextResponse.json(
          { error: "Webhook secret not configured" },
          { status: 503 },
        );
      }

      try {
        event = verifyDodoWebhook(
          rawBody,
          req.headers,
          DODO_PAYMENTS_WEBHOOK_SECRET,
        );
      } catch (error) {
        console.error("[Dodo Webhook] Invalid signature", error);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const { eventType, paymentSessionId, externalPaymentId } =
      extractDodoPaymentReferences(event);
    const nextStatus = inferPaymentStatusFromDodoEvent(event);

    if (!paymentSessionId && !externalPaymentId) {
      console.error("[Dodo Webhook] Could not resolve payment reference", event);
      return NextResponse.json(
        { error: "Payment reference missing" },
        { status: 400 },
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        provider: "dodo",
        OR: [
          ...(externalPaymentId
            ? [{ externalPaymentId }]
            : []),
          ...(paymentSessionId
            ? [{ sessionId: paymentSessionId }]
            : []),
        ],
      },
    });

    if (!payment) {
      console.error("[Dodo Webhook] Payment not found", {
        eventType,
        paymentSessionId,
        externalPaymentId,
      });
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "confirmed" || payment.status === "failed") {
      return NextResponse.json({
        success: true,
        message: "Already processed",
      });
    }

    const updatedPayment = nextStatus
      ? await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: nextStatus,
            confirmedAt:
              nextStatus === "confirmed" ? new Date() : payment.confirmedAt,
          },
        })
      : payment;

    if (updatedPayment.status === "confirmed") {
      const result = await fulfillConfirmedPayment({
        payment: updatedPayment,
        requestUrl: req.url,
        logPrefix: "[Dodo Webhook]",
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({
      success: true,
      eventType,
      status: updatedPayment.status,
    });
  } catch (error: unknown) {
    console.error("[Dodo Webhook] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
