import { NextRequest, NextResponse } from "next/server";
import { generateBurnerWallet, pollForPayment, getPaymentStatus, getBurnerAddress } from "@/lib/hyperevm";

// POST /api/payment/hyperevm/create
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Generate burner wallet
    const wallet = generateBurnerWallet(sessionId);

    // Start polling in background (don't await)
    pollForPayment(sessionId, (status) => {
      console.log(`[HyperEVM Payment] Status update for ${sessionId}:`, status.status);
    }).then((success) => {
      if (success) {
        console.log(`[HyperEVM Payment] Completed for ${sessionId}`);
      } else {
        console.log(`[HyperEVM Payment] Timeout for ${sessionId}`);
      }
    });

    return NextResponse.json({
      address: wallet.address,
      amount: "135", // 10% discount: $150 → $135
      token: "USDH",
      network: "HyperEVM",
      discount: "10%",
    });
  } catch (error: any) {
    console.error("[HyperEVM] Create payment error:", error);
    return NextResponse.json({ error: error.message || "Failed to create payment" }, { status: 500 });
  }
}

// GET /api/payment/hyperevm/status?sessionId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const status = getPaymentStatus(sessionId);
    const address = getBurnerAddress(sessionId);

    if (!status) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: status.status,
      address,
      amount: status.amount,
      txHash: status.txHash,
      blockNumber: status.blockNumber,
    });
  } catch (error: any) {
    console.error("[HyperEVM] Status check error:", error);
    return NextResponse.json({ error: error.message || "Failed to check status" }, { status: 500 });
  }
}
