import { NextRequest, NextResponse } from "next/server";
import { initUSDHPayment, pollForPayment, getPaymentStatus } from "@/lib/hyperevm";
import { getWalletPoolStats } from "@/lib/walletPool";
import { Pool } from "pg";

// POST /api/payment/hyperevm/create
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Debug: Direct query
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    const directResult = await pool.query("SELECT COUNT(*) as c FROM wallet_pool WHERE status = 'available'");
    const directCount = parseInt(directResult.rows[0].c);
    await pool.end();
    
    // Debug: Check wallet pool stats first
    const stats = await getWalletPoolStats();
    console.log("[HyperEVM] Pool stats:", stats, "Direct query:", directCount);

    // Link to user if provided
    let linkedUserId = userId;
    if (!linkedUserId) {
      const cookieUserId = req.cookies.get("userId")?.value;
      linkedUserId = cookieUserId;
    }

    // Initialize payment with wallet from secure pool
    const payment = await initUSDHPayment(sessionId, linkedUserId);
    
    if (!payment) {
      return NextResponse.json({ 
        error: "No wallets available in pool. Contact admin.",
        debug: { stats, directCount, env: { hasWalletEncryptionKey: !!process.env.WALLET_ENCRYPTION_KEY } }
      }, { status: 503 });
    }

    // Start polling in background (don't await)
    pollForPayment(sessionId, (status) => {
      console.log(`[HyperEVM Payment] Status update for ${sessionId}: ${status}`);
    }).then((success) => {
      if (success) {
        console.log(`[HyperEVM Payment] Completed for ${sessionId}`);
      } else {
        console.log(`[HyperEVM Payment] Timeout for ${sessionId}`);
      }
    });

    return NextResponse.json({
      address: payment.walletAddress,
      amount: payment.amount.toString(),
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
    const check = searchParams.get("check");

    // Debug endpoint: /api/payment/hyperevm/status?check=pool
    if (check === "pool") {
      const stats = await getWalletPoolStats();
      return NextResponse.json({
        stats,
        env: {
          hasWalletEncryptionKey: !!process.env.WALLET_ENCRYPTION_KEY,
          hasMasterWallet: !!process.env.HYPEREVM_MASTER_WALLET,
          hasPMWalletKey: !!process.env.PM_WALLET_KEY,
          encryptionKeyLength: process.env.WALLET_ENCRYPTION_KEY?.length || 0,
          nodeEnv: process.env.NODE_ENV,
        }
      });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const status = getPaymentStatus(sessionId);

    if (!status) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: status.status,
      address: status.walletAddress,
      amount: status.amount,
      txHash: status.txHash,
    });
  } catch (error: any) {
    console.error("[HyperEVM] Status check error:", error);
    return NextResponse.json({ error: error.message || "Failed to check status" }, { status: 500 });
  }
}
// Deployed at Fri Feb  6 22:08:59 -03 2026
