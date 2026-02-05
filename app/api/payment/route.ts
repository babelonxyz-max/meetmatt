import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PRICES = {
  starter: 29,
  pro: 99,
  enterprise: 299,
};

const SUPPORTED_CURRENCIES: Record<string, { name: string; chain: string }> = {
  USDT_BSC: { name: "USDT", chain: "BSC" },
  USDT_SOL: { name: "USDT", chain: "Solana" },
  USDT_TRON: { name: "USDT", chain: "TRON" },
  USDC_BASE: { name: "USDC", chain: "Base" },
  USDC_SOL: { name: "USDC", chain: "Solana" },
};

// Get addresses from env or use demo addresses
function getPaymentAddress(currency: string): { address: string; isDemo: boolean } {
  const envMap: Record<string, string | undefined> = {
    USDT_BSC: process.env.EVM_PAYMENT_ADDRESS,
    USDT_SOL: process.env.SOL_PAYMENT_ADDRESS,
    USDT_TRON: process.env.TRON_PAYMENT_ADDRESS,
    USDC_BASE: process.env.EVM_PAYMENT_ADDRESS,
    USDC_SOL: process.env.SOL_PAYMENT_ADDRESS,
  };

  const address = envMap[currency];
  
  if (address) {
    return { address, isDemo: false };
  }

  // Demo addresses
  const demoAddresses: Record<string, string> = {
    USDT_BSC: "0x742d35Cc6634C0532925a3b8D4C0d7c8b8d4e21F",
    USDC_BASE: "0x742d35Cc6634C0532925a3b8D4C0d7c8b8d4e21F",
    USDT_SOL: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
    USDC_SOL: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
    USDT_TRON: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  };

  return { address: demoAddresses[currency] || "0x0000000000000000000000000000000000000000", isDemo: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, tier, currency } = body;

    if (!sessionId || !tier || !currency) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!PRICES[tier as keyof typeof PRICES]) {
      return NextResponse.json(
        { error: "Invalid tier" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_CURRENCIES[currency]) {
      return NextResponse.json(
        { error: "Invalid currency" },
        { status: 400 }
      );
    }

    const { address, isDemo } = getPaymentAddress(currency);
    const amount = PRICES[tier as keyof typeof PRICES];

    const payment = await prisma.payment.create({
      data: {
        sessionId,
        tier,
        currency,
        amount,
        address,
        status: isDemo ? "confirmed" : "pending",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    return NextResponse.json({
      id: payment.id,
      address,
      currency,
      amount,
      status: isDemo ? "confirmed" : "pending",
      isDemo,
    });
  } catch (error: any) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id },
      });

      if (!payment) {
        return NextResponse.json(
          { error: "Payment not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  // Return payment config
  const hasRealAddresses = process.env.EVM_PAYMENT_ADDRESS || process.env.SOL_PAYMENT_ADDRESS;
  
  return NextResponse.json({
    prices: PRICES,
    currencies: SUPPORTED_CURRENCIES,
    demo: !hasRealAddresses,
  });
}
