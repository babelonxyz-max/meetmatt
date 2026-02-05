import Stripe from "stripe";
import { prisma } from "./prisma";

// Lazy initialization of Stripe client
let stripeInstance: Stripe | null = null;

function getStripe() {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeInstance = new Stripe(key, {
      apiVersion: "2024-12-18.acacia" as any,
    });
  }
  return stripeInstance;
}

// Create or get Stripe customer
export async function getOrCreateCustomer(userId: string, email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await getStripe().customers.create({
      email,
      metadata: {
        userId,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw error;
  }
}

// Create subscription checkout session
export async function createCheckoutSession({
  userId,
  email,
  planId,
  interval,
  couponCode,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  planId: string;
  interval: "monthly" | "yearly";
  couponCode?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error("Plan not found");
    }

    const customerId = await getOrCreateCustomer(userId, email);
    const priceId =
      interval === "monthly"
        ? plan.stripePriceIdMonthly
        : plan.stripePriceIdYearly;

    if (!priceId) {
      throw new Error("Plan price not configured");
    }

    const sessionConfig: any = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planId,
        interval,
        couponCode: couponCode || "",
      },
      subscription_data: {
        metadata: {
          userId,
          planId,
        },
      },
    };

    const session = await getStripe().checkout.sessions.create(sessionConfig);

    // Create pending subscription record
    await prisma.subscription.create({
      data: {
        userId,
        planId,
        status: "incomplete",
        interval,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stripeSubscriptionId: session.subscription as string,
      },
    });

    return session;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
}

// Create customer portal session
export async function createPortalSession(customerId: string, returnUrl: string) {
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error("Error creating portal session:", error);
    throw error;
  }
}

// Handle Stripe webhook events
export async function handleWebhookEvent(event: Stripe.Event) {
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        await handleCheckoutCompleted(session);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        await handleInvoiceFailed(invoice);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        await handleSubscriptionCanceled(subscription);
        break;
      }
    }

    return true;
  } catch (error) {
    console.error("Error handling webhook:", error);
    return false;
  }
}

async function handleCheckoutCompleted(session: any) {
  const { userId, planId, interval, couponCode } = session.metadata || {};

  if (!userId || !planId) return;

  const subscription = await getStripe().subscriptions.retrieve(
    session.subscription as string
  );

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: (subscription as any).id },
    data: {
      status: "active",
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    },
  });

  // Process referral commission if coupon was used
  if (couponCode) {
    const { processReferralCommission } = await import("./affiliate");
    // Find the payment and process commission
    const payment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: session.payment_intent as string },
    });
    if (payment) {
      await processReferralCommission(payment.id, couponCode);
    }
  }
}

async function handleInvoicePaid(invoice: any) {
  const subscriptionId = invoice.subscription as string;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: "active",
      currentPeriodStart: new Date(invoice.period_start * 1000),
      currentPeriodEnd: new Date(invoice.period_end * 1000),
    },
  });

  // Create payment record
  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (subscription) {
    await prisma.payment.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: "completed",
        paymentMethod: "stripe",
        stripePaymentIntentId: invoice.payment_intent as string,
      },
    });
  }
}

async function handleInvoiceFailed(invoice: any) {
  const subscriptionId = invoice.subscription as string;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: "past_due",
    },
  });
}

async function handleSubscriptionUpdated(subscription: any) {
  const status = subscription.status as any;

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionCanceled(subscription: any) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  });
}
