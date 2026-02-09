import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculatePricing, getIpnCallbackUrl } from "@/lib/pricing";

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

// Map common currency codes to NowPayments format
const CURRENCY_MAP: Record<string, string> = {
  "usdt": "usdt",
  "usdc": "usdc",
  "btc": "btc",
  "eth": "eth",
  "bnb": "bnb",
  "busd": "busd",
  "dai": "dai",
  "trx": "trx",
};

function formatCurrency(currency: string): string {
  const lower = currency.toLowerCase();
  return CURRENCY_MAP[lower] || lower;
}

// POST /api/subscription/extend - Create payment for subscription extension
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, userId, months = 1, currency = "usdt" } = body;

    if (!agentId || !userId) {
      return NextResponse.json(
        { error: "agentId and userId required" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { user: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Calculate price using unified pricing system
    const pricing = calculatePricing(agent.tier, months);
    const orderId = `extend_${agentId}_${months}m_${Date.now()}`;
    
    console.log("[Subscription/Extend] Creating payment:", {
      agent: agent.name,
      tier: agent.tier,
      months,
      price: pricing.price,
      hasApiKey: !!NOWPAYMENTS_API_KEY,
    });
    
    // If NOWPAYMENTS_API_KEY is not set, return mock for testing
    if (!NOWPAYMENTS_API_KEY) {
      console.log("[Subscription/Extend] No NOWPAYMENTS_API_KEY, returning mock");
      
      const mockPayment = await prisma.payment.create({
        data: {
          sessionId: orderId,
          userId,
          tier: agent.tier,
          currency: currency.toUpperCase(),
          amount: pricing.price,
          address: "0xMockAddressForTesting",
          status: "pending",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      return NextResponse.json({
        success: true,
        mock: true,
        pricing,
        payment: {
          id: mockPayment.id,
          address: mockPayment.address,
          amount: pricing.price,
          currency: currency.toUpperCase(),
          status: "pending",
          months,
          message: "Payment system not configured. This is a test payment.",
        },
      });
    }
    
    // Format currency for NowPayments
    const payCurrency = formatCurrency(currency);
    
    // First get an estimate
    const estimateResponse = await fetch(
      `${NOWPAYMENTS_API_URL}/estimate?amount=${pricing.price}&currency_from=usd&currency_to=${payCurrency}`,
      {
        headers: {
          "x-api-key": NOWPAYMENTS_API_KEY,
        },
      }
    );
    
    if (!estimateResponse.ok) {
      const errorText = await estimateResponse.text();
      console.error("[Subscription/Extend] Estimate error:", errorText);
      throw new Error(`Cannot get estimate for ${currency}. Please try another currency.`);
    }

    // Call NowPayments API to create payment
    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NOWPAYMENTS_API_KEY,
      },
      body: JSON.stringify({
        price_amount: pricing.price,
        price_currency: "usd",
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: `Extend ${agent.name} subscription by ${months} month(s)`,
        ipn_callback_url: getIpnCallbackUrl(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Subscription/Extend] NowPayments error:", {
        status: response.status,
        body: errorText,
      });
      
      let errorMessage = "Payment creation failed";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("[Subscription/Extend] Payment created:", { 
      paymentId: data.payment_id,
      payAddress: data.pay_address?.slice(0, 10) + "...",
    });

    const payment = await prisma.payment.create({
      data: {
        sessionId: orderId,
        userId,
        tier: agent.tier,
        currency: currency.toUpperCase(),
        amount: data.pay_amount,
        address: data.pay_address,
        status: "pending",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      pricing,
      payment: {
        id: payment.id,
        address: data.pay_address,
        amount: data.pay_amount,
        currency: data.pay_currency,
        status: "pending",
        months,
      },
    });

  } catch (error: any) {
    console.error("[Subscription/Extend] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}
