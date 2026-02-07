import { NextRequest, NextResponse } from "next/server";

const PM_WALLET = process.env.HYPEREVM_MASTER_WALLET || "";

export async function POST(req: NextRequest) {
  return NextResponse.json({
    address: PM_WALLET || "0xNOT_CONFIGURED",
    amount: "135",
    token: "USDH",
    network: "HyperEVM",
  });
}
