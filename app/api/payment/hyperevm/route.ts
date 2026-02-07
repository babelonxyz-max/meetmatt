// Simplified USDH Payment - Direct PM Wallet
import { NextRequest, NextResponse } from "next/server";

const PM_WALLET = process.env.HYPEREVM_MASTER_WALLET || "";
const DISCOUNTED_AMOUNT = 135; // USDH with 10% discount

// POST - Return PM wallet address for payment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    if (!PM_WALLET) {
      return NextResponse.json({ error: "PM wallet not configured" }, { status: 500 });
    }

    return NextResponse.json({
      address: PM_WALLET,
      amount: DISCOUNTED_AMOUNT.toString(),
      token: "USDH",
      network: "HyperEVM",
      discount: "10%",
      sessionId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Check payment status (auto-confirm for demo)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // TODO: In production, check blockchain for actual payment
    // For demo: auto-confirm immediately
    return NextResponse.json({
      status: "confirmed",
      address: PM_WALLET,
      amount: DISCOUNTED_AMOUNT,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
