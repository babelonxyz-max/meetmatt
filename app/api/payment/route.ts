import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";

const PRICES = {
  starter: 4900,
  pro: 9900,
  enterprise: 29900,
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
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { planId, currency, cryptoCurrency } = body;

    if (!planId || !currency) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const amount = PRICES[planId as keyof typeof PRICES];
    if (!amount) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    const { address, isDemo } = cryptoCurrency ? getPaymentAddress(cryptoCurrency) : { address: "", isDemo: true };

    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount,
        currency,
        status: isDemo ? "completed" : "pending",
        paymentMethod: cryptoCurrency ? "crypto" : "stripe",
        cryptoCurrency: cryptoCurrency || null,
      },
    });

    return NextResponse.json({
      id: payment.id,
      address,
      currency,
      amount: amount / 100, // Convert cents to dollars
      status: isDemo ? "completed" : "pending",
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
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID required" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId: session.user.id,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ payment });
  } catch (error: any) {
    console.error("Payment fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment" },
      { status: 500 }
    );
  }
}
