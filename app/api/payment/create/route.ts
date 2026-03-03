import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage, getStatusError } from "@/lib/http-error";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

const ALLOWED_CURRENCIES = [
  "usdt", "usdterc20", "usdtbsc", "usdtsol",
  "usdc", "usdccsol", "usdcarb",
];

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      console.error("[Payment/Create] NOWPAYMENTS_API_KEY not configured");
      return NextResponse.json({ error: "Payment service not configured" }, { status: 503 });
    }

    const { userId } = await requireAuth(req);
    const body = await req.json();
    const { agentId, currency = "usdt" } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: "Unsupported currency" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const orderId = `matt_${agentId}_${Date.now()}`;

    const configuredBaseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!configuredBaseUrl) {
      console.error("[Payment/Create] APP_URL/NEXT_PUBLIC_APP_URL not configured");
      return NextResponse.json({ error: "Application URL not configured" }, { status: 503 });
    }

    let callbackBaseUrl: string;
    try {
      callbackBaseUrl = new URL(configuredBaseUrl).origin;
    } catch {
      console.error("[Payment/Create] Invalid APP_URL/NEXT_PUBLIC_APP_URL:", configuredBaseUrl);
      return NextResponse.json({ error: "Application URL invalid" }, { status: 503 });
    }

    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        price_amount: 150,
        price_currency: "usd",
        pay_currency: currency,
        order_id: orderId,
        order_description: `Deploy AI agent: ${agent.name}`,
        ipn_callback_url: `${callbackBaseUrl}/api/webhooks/payment`,
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

  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("[Payment/Create] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}
