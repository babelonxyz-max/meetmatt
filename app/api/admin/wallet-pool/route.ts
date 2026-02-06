import { NextRequest, NextResponse } from "next/server";
import { generateWalletPool, getWalletPoolStats } from "@/lib/walletPool";

// POST /api/admin/wallet-pool/generate
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const adminToken = process.env.ADMIN_AUTH_TOKEN;
    
    if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    const count = body.count || 100;
    
    if (count > 1000) {
      return NextResponse.json({ error: "Max 1000 wallets per request" }, { status: 400 });
    }
    
    const addresses = await generateWalletPool(count);
    
    return NextResponse.json({
      success: true,
      generated: addresses.length,
      addresses: addresses.slice(0, 10),
    });
  } catch (error: any) {
    console.error("[Admin] Generate wallet pool error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate wallets" },
      { status: 500 }
    );
  }
}

// GET /api/admin/wallet-pool/stats
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const adminToken = process.env.ADMIN_AUTH_TOKEN;
    
    if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const stats = await getWalletPoolStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("[Admin] Wallet pool stats error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get stats" },
      { status: 500 }
    );
  }
}
