import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

export async function POST() {
  const connectionString = process.env.DATABASE_URL || "";
  
  try {
    const pool = new Pool({ connectionString });
    
    // Count before
    const before = await pool.query("SELECT COUNT(*) as c FROM wallet_pool");
    
    // Insert directly
    const testId = `direct_${Date.now()}`;
    await pool.query(
      "INSERT INTO wallet_pool (id, address, encrypted_private_key, status, pm_approved, hyper_balance, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
      [testId, "0x1234567890123456789012345678901234567890", "test:enc", "available", false, "0"]
    );
    
    // Count after
    const after = await pool.query("SELECT COUNT(*) as c FROM wallet_pool");
    
    await pool.end();
    
    return NextResponse.json({
      before: parseInt(before.rows[0].c),
      after: parseInt(after.rows[0].c),
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
