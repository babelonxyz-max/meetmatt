import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIpnCallbackUrl } from "@/lib/pricing";

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

// Map common currency codes to NowPayments format
const CURRENCY_MAP: Record<string, string> = {
  "usdt": "usdttrc20",  // Use TRC20 for lower fees
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, userId, currency = "usdt" } = body;

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

    const orderId = `matt_${agentId}_${Date.now()}`;
    
    // Format currency for NowPayments
    const payCurrency = formatCurrency(currency);
    
    // First get an estimate to validate currency is supported
    const estimateResponse = await fetch(
      `${NOWPAYMENTS_API_URL}/estimate?amount=150&currency_from=usd&currency_to=${payCurrency}`,
      {
        headers: {
          "x-api-key": NOWPAYMENTS_API_KEY,
        },
      }
    );
    
    if (!estimateResponse.ok) {
      const errorText = await estimateResponse.text();
      console.error("[Payment/Create] Estimate error:", errorText);
      throw new Error(`Currency ${currency} is not supported. Please try USDT, USDC, BTC, or ETH.`);
    }
    
    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NOWPAYMENTS_API_KEY,
      },
      body: JSON.stringify({
        price_amount: 150,
        price_currency: "usd",
        pay_currency: payCurrency,
        order_id: orderId,
        order_description: `Deploy AI agent: ${agent.name}`,
        ipn_callback_url: getIpnCallbackUrl(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Payment creation failed");
    }

    const data = await response.json();

    const payment = await prisma.payment.create({
      data: {
        sessionId: orderId,
        userId,
        tier: "matt",
        currency: currency.toUpperCase(),
        amount: data.pay_amount,
        address: data.pay_address,
        status: "pending",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        address: data.pay_address,
        amount: data.pay_amount,
        currency: data.pay_currency,
        status: "pending",
      },
    });

  } catch (error: any) {
    console.error("[Payment/Create] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}
