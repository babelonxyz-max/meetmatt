// v2.0 - Complete rewrite with pg driver
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { ethers } from "ethers";

const DISCOUNTED_AMOUNT = 135; // 10% discount

async function getPoolStats() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const result = await pool.query("SELECT COUNT(*) as c FROM wallet_pool WHERE status = 'available'");
    return parseInt(result.rows[0].c);
  } finally {
    await pool.end();
  }
}

async function assignWallet(sessionId: string) {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    // Find available wallet
    const findResult = await pool.query(
      "SELECT id, address FROM wallet_pool WHERE status = 'available' ORDER BY created_at ASC LIMIT 1"
    );
    
    if (findResult.rowCount === 0) return null;
    
    const wallet = findResult.rows[0];
    
    // Mark as assigned
    await pool.query(
      "UPDATE wallet_pool SET status = 'assigned', assigned_to_session = $1, assigned_at = NOW() WHERE id = $2",
      [sessionId, wallet.id]
    );
    
    return { id: wallet.id, address: wallet.address };
  } finally {
    await pool.end();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Check available wallets
    const availableCount = await getPoolStats();
    
    if (availableCount === 0) {
      return NextResponse.json({ 
        error: "No wallets available in pool",
        debug: { availableCount, hasDbUrl: !!process.env.DATABASE_URL }
      }, { status: 503 });
    }

    // Assign wallet
    const wallet = await assignWallet(sessionId);
    
    if (!wallet) {
      return NextResponse.json({ error: "Failed to assign wallet" }, { status: 503 });
    }

    return NextResponse.json({
      address: wallet.address,
      amount: DISCOUNTED_AMOUNT.toString(),
      token: "USDH",
      network: "HyperEVM",
      discount: "10%",
    });
  } catch (error: any) {
    console.error("[HyperEVM] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const check = searchParams.get("check");
  
  if (check === "pool") {
    const count = await getPoolStats();
    return NextResponse.json({ availableWallets: count });
  }
  
  return NextResponse.json({ status: "ok", version: "2.0" });
}
