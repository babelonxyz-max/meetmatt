import { NextResponse } from "next/server";
import { Pool } from "@neondatabase/serverless";

export async function POST() {
  const connectionString = process.env.DATABASE_URL || "";
  
  try {
    const pool = new Pool({ connectionString });
    
    // Test 1: Simple query
    const result1 = await pool.query("SELECT 1 as test");
    
    // Test 2: Insert directly
    const testId = `direct_${Date.now()}`;
    const result2 = await pool.query(
      "INSERT INTO wallet_pool (id, address, encrypted_private_key, status, pm_approved, hyper_balance, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id",
      [testId, "0x1234567890123456789012345678901234567890", "test:enc", "available", false, "0"]
    );
    
    // Test 3: Verify insert
    const result3 = await pool.query("SELECT id FROM wallet_pool WHERE id = $1", [testId]);
    
    await pool.end();
    
    return NextResponse.json({
      select: result1.rows,
      insert: result2.rows,
      verify: result3.rows,
      found: result3.rows.length > 0,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack?.split("\n")[0]
    }, { status: 500 });
  }
}
