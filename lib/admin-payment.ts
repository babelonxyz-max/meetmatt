import { PaymentProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fulfillConfirmedPayment } from "@/lib/payment-fulfillment";

function buildAdminPaymentSessionId(agentId: string, plan: "monthly" | "day_pass") {
  const prefix = plan === "day_pass" ? "daypass" : "matt";
  return `${prefix}_${agentId}_${Date.now()}_admin`;
}

function roundUsdAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function createConfirmedAdminPaymentForAgent(params: {
  agentId: string;
  userId: string | null;
  workspaceId: string | null;
  plan: "monthly" | "day_pass";
  amountUsd: number;
  requestUrl: string;
  source: string;
  notes?: string | null;
}) {
  const paymentPurpose =
    params.plan === "day_pass" ? "agent_day_pass" : "agent_subscription";
  const payment = await prisma.payment.create({
    data: {
      sessionId: buildAdminPaymentSessionId(params.agentId, params.plan),
      provider: PaymentProvider.admin,
      paymentMethodType: null,
      externalPaymentId: null,
      tier: "matt",
      currency: "USD",
      amount: roundUsdAmount(params.amountUsd),
      address: null,
      checkoutUrl: null,
      status: "confirmed",
      confirmedAt: new Date(),
      expiresAt: new Date(),
      paymentPurpose,
      targetType: "agent",
      targetId: params.agentId,
      lineItems: {
        agentId: params.agentId,
        billingPlan: params.plan,
        billedAmountUsd: roundUsdAmount(params.amountUsd),
        fulfilledInternally: true,
        source: params.source,
        notes: params.notes?.trim() || null,
      },
      providerMetadata: {
        source: params.source,
        notes: params.notes?.trim() || null,
        internal: true,
      },
      userId: params.userId,
      workspaceId: params.workspaceId,
    },
  });

  await fulfillConfirmedPayment({
    payment,
    requestUrl: params.requestUrl,
    logPrefix: `[AdminPayment:${params.source}]`,
  });

  return payment;
}
