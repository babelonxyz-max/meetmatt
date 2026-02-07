import { NextRequest, NextResponse } from "next/server";
import { generateWalletPool, getWalletPoolStats } from "@/lib/walletPool";

const ADMIN_TOKEN = process.env.ADMIN_AUTH_TOKEN || "ddec17a6bb0809ae085b65653292cf5bbf7a02eabb1d86f671b44f8d16fef7c4";

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return !!authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`;
}

// POST /api/admin/wallet-pool - Generate new wallets
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const count = body.count || 100;
    
    if (count < 1 || count > 500) {
      return NextResponse.json(
        { error: "Count must be between 1 and 500" },
        { status: 400 }
      );
    }

    const addresses = await generateWalletPool(count);

    return NextResponse.json({
      success: true,
      generated: addresses.length,
      addresses: addresses.slice(0, 10),
      totalAvailable: addresses.length,
    });
  } catch (error: any) {
    console.error("Wallet pool generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate wallet pool", details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/admin/wallet-pool - Get stats
export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getWalletPoolStats();

    return NextResponse.json({
      success: true,
      ...stats,
      masterWallet: process.env.HYPEREVM_MASTER_WALLET || "not configured",
    });
  } catch (error: any) {
    console.error("Failed to get wallet pool stats:", error);
    return NextResponse.json(
      { error: "Failed to get stats", details: error.message },
      { status: 500 }
    );
  }
}
