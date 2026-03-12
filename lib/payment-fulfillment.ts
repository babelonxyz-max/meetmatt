import { Payment } from "@prisma/client";
import { ensurePrimaryTelegramIdentityForAgent } from "@/lib/agent-telegram";
import { TRANSPORT_PROVIDER } from "@/lib/agent-blueprint";
import { prisma } from "@/lib/prisma";
import { activateSubscription } from "@/lib/subscription";
import { sendEmail, paymentConfirmedEmail, deploymentFailedEmail } from "@/lib/email";
import {
  activateAgentCapabilityEntitlements,
  attachCatalogItemToAgent,
  grantEntitlementPackToAgent,
} from "@/lib/capability-commerce/provisioning";

function readLineItemString(
  lineItems: unknown,
  key: string,
): string | null {
  if (!lineItems || Array.isArray(lineItems) || typeof lineItems !== "object") {
    return null;
  }

  const value = (lineItems as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function resolveSubscriptionPlan(payment: Payment): "monthly" | "annual" | "day_pass" {
  if (
    payment.paymentPurpose === "agent_day_pass" ||
    readLineItemString(payment.lineItems, "billingPlan") === "day_pass"
  ) {
    return "day_pass";
  }

  if (readLineItemString(payment.lineItems, "billingPlan") === "annual") {
    return "annual";
  }

  return "monthly";
}

export async function fulfillConfirmedPayment(params: {
  payment: Payment;
  requestUrl: string;
  logPrefix?: string;
}) {
  const logPrefix = params.logPrefix ?? "[Payment Fulfillment]";
  const { payment, requestUrl } = params;
  const subscriptionPlan = resolveSubscriptionPlan(payment);

  const orderParts = payment.sessionId.split("_");
  const fallbackAgentId =
    orderParts.length >= 3 ? orderParts[1] ?? null : null;
  const agentId =
    (payment.targetType === "agent" ? payment.targetId : null) ||
    readLineItemString(payment.lineItems, "agentId") ||
    fallbackAgentId;

  if (!agentId) {
    console.error(`${logPrefix} Cannot determine agentId for payment:`, payment.sessionId);
    return { warning: "Could not determine agent" } as const;
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    console.error(`${logPrefix} Agent not found:`, agentId);
    return { warning: "Agent not found" } as const;
  }

  if (payment.paymentPurpose === "addon") {
    const catalogItemSlug =
      readLineItemString(payment.lineItems, "catalogItemSlug") ||
      (payment.targetType === "catalog_item" && payment.targetId
        ? (
            await prisma.catalogItem.findUnique({
              where: { id: payment.targetId },
              select: { slug: true },
            })
          )?.slug ?? null
        : null);

    if (!catalogItemSlug) {
      console.error(`${logPrefix} Missing catalog item for add-on payment:`, payment.id);
      return { warning: "Catalog item missing" } as const;
    }

    await attachCatalogItemToAgent({
      agentId: agent.id,
      catalogItemSlug,
      source: `payment:addon:${payment.id}`,
      paymentId: payment.id,
      grantLinkedEntitlements: true,
    });

    return { provisioned: "addon" } as const;
  }

  if (payment.paymentPurpose === "topup") {
    const packId =
      payment.targetType === "entitlement_pack" ? payment.targetId : null;

    if (!packId) {
      console.error(`${logPrefix} Missing entitlement pack for top-up payment:`, payment.id);
      return { warning: "Entitlement pack missing" } as const;
    }

    await grantEntitlementPackToAgent({
      agentId: agent.id,
      entitlementPackId: packId,
      source: `payment:topup:${payment.id}`,
      paymentId: payment.id,
    });

    return { provisioned: "topup" } as const;
  }

  const alreadyProvisionedRuntime =
    agent.status === "active" ||
    agent.status === "deploying" ||
    agent.deployState === "queued" ||
    agent.deployState === "provisioning" ||
    agent.activationStatus === "active" ||
    agent.activationStatus === "activating";

  if (alreadyProvisionedRuntime) {
    const subData = activateSubscription(subscriptionPlan);
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        ...subData,
        lastPaymentId: payment.id,
        deployErrorCode: null,
        deployErrorMessage: null,
      },
    });

    await activateAgentCapabilityEntitlements(agent.id, {
      paymentId: payment.id,
    }).catch((error: unknown) => {
      console.error(
        `${logPrefix} Failed to activate capability entitlements:`,
        error,
      );
    });

    const user = await prisma.user.findUnique({ where: { id: payment.userId ?? undefined } });
    if (user?.email) {
      const { subject, html } = paymentConfirmedEmail(agent.name, payment.amount);
      await sendEmail(user.email, subject, html).catch((error: unknown) => {
        console.error(`${logPrefix} Failed to send confirmation email:`, error);
      });
    }

    return {
      provisioned: "subscription",
      state: agent.status === "active" ? "already-live" : "already-provisioning",
    } as const;
  }

  const telegramLaunch = await ensurePrimaryTelegramIdentityForAgent(agent.id);
  if (
    !telegramLaunch?.botAssigned ||
    (
      (telegramLaunch.transportProvider === TRANSPORT_PROVIDER.telegramBotApi ||
        agent.transportProvider === TRANSPORT_PROVIDER.telegramBotApi) &&
      !telegramLaunch.botToken
    )
  ) {
    console.error(`${logPrefix} Agent is missing a primary Telegram bot:`, agent.id);
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        activationStatus: "failed",
        status: "error",
        deployState: "failed",
        deployErrorCode: "TELEGRAM_BOT_MISSING",
        deployErrorMessage: "Assign a primary Telegram bot before deployment",
        lastPaymentId: payment.id,
      },
    });
    return { provisioned: "subscription", state: "failed" } as const;
  }

  console.log(`${logPrefix} Triggering deployment for agent:`, agent.id);

  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      activationStatus: "activating",
      deployState: "pending",
      deployErrorCode: null,
      deployErrorMessage: null,
      lastPaymentId: payment.id,
    },
  });

  if (!process.env.INTERNAL_WEBHOOK_SECRET) {
    console.error(`${logPrefix} INTERNAL_WEBHOOK_SECRET not set, cannot trigger deploy`);
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        activationStatus: "failed",
        status: "error",
        deployState: "failed",
        deployErrorCode: "CONFIG_MISSING",
        deployErrorMessage: "INTERNAL_WEBHOOK_SECRET not set",
      },
    });
    return { provisioned: "subscription", state: "failed" } as const;
  }

  const triggerUrl = new URL("/api/agents/trigger-deploy", requestUrl).toString();
  const triggerResponse = await fetch(triggerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_WEBHOOK_SECRET,
    },
    body: JSON.stringify({ agentId: agent.id }),
  });

  if (!triggerResponse.ok) {
    const errorText = await triggerResponse.text().catch(() => "");
    console.error(`${logPrefix} Deploy trigger failed:`, triggerResponse.status, errorText);
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        activationStatus: "failed",
        status: "error",
        deployState: "failed",
        deployErrorCode: `HTTP_${triggerResponse.status}`,
        deployErrorMessage: errorText.slice(0, 500),
      },
    });

    const failedUser = await prisma.user.findUnique({ where: { id: payment.userId ?? undefined } });
    if (failedUser?.email) {
      const { subject, html } = deploymentFailedEmail(agent.name);
      await sendEmail(failedUser.email, subject, html).catch((error: unknown) => {
        console.error(`${logPrefix} Failed to send deployment-failed email:`, error);
      });
    }

    return { provisioned: "subscription", state: "failed" } as const;
  }

  const triggerPayload = await triggerResponse.json().catch(() => ({} as Record<string, unknown>));
  const queued = triggerPayload["queued"] === true;
  const deployState = queued ? "queued" : "provisioning";
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      deployState,
    },
  });

  console.log(`${logPrefix} Deploy triggered successfully for agent:`, agent.id);

  const subData = activateSubscription(subscriptionPlan);
  await prisma.agent.update({
    where: { id: agent.id },
    data: subData,
  });
  console.log(`${logPrefix} Subscription activated for agent:`, agent.id);

  await activateAgentCapabilityEntitlements(agent.id, {
    paymentId: payment.id,
  }).catch((error: unknown) => {
    console.error(
      `${logPrefix} Failed to activate capability entitlements:`,
      error,
    );
  });

  const user = await prisma.user.findUnique({ where: { id: payment.userId ?? undefined } });
  if (user?.email) {
    const { subject, html } = paymentConfirmedEmail(agent.name, payment.amount);
    await sendEmail(user.email, subject, html).catch((error: unknown) => {
      console.error(`${logPrefix} Failed to send confirmation email:`, error);
    });
  }

  return { provisioned: "subscription", state: queued ? "queued" : "provisioning" } as const;
}
