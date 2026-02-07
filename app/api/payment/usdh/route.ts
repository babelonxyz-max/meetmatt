// Temporary: Forward to NowPayments
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Just return PM wallet for manual payment
  return NextResponse.json({
    address: process.env.HYPEREVM_MASTER_WALLET || "0xNOT_CONFIGURED",
    amount: "135",
    token: "USDH",
    network: "HyperEVM",
    note: "Send USDH to this address",
  });
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
