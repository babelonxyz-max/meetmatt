import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, createCustomer } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, agentId, priceType = "monthly", successUrl, cancelUrl } = body;

    if (!userId || !agentId) {
      return NextResponse.json(
        { error: "userId and agentId required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await createCustomer({
        email: user.email || "",
        name: user.name || undefined,
      });
      customerId = customer.id;
      
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const priceId = priceType === "yearly" 
      ? process.env.STRIPE_PRICE_YEARLY 
      : process.env.STRIPE_PRICE_MONTHLY;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured" },
        { status: 500 }
      );
    }

    const session = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: { userId, agentId, priceType },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });

  } catch (error: any) {
    console.error("[Stripe/Checkout] Error:", error);
    return NextResponse.json(
      { error: error.message || "Checkout creation failed" },
      { status: 500 }
    );
  }
}
