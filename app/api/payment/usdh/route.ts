import { NextRequest, NextResponse } from "next/server";

const PM_WALLET = process.env.HYPEREVM_MASTER_WALLET || "";
const AMOUNT = 135;

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  if (!PM_WALLET) return NextResponse.json({ error: "PM wallet not configured" }, { status: 500 });
  
  return NextResponse.json({
    address: PM_WALLET,
    amount: AMOUNT.toString(),
    token: "USDH",
    network: "HyperEVM",
    discount: "10%",
    sessionId,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  
  return NextResponse.json({
    status: "confirmed",
    address: PM_WALLET,
    amount: AMOUNT,
  });
}
