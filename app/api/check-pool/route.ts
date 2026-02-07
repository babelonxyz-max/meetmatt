import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const result = await pool.query(
      "SELECT id, address, status FROM wallet_pool ORDER BY created_at DESC LIMIT 10"
    );
    
    await pool.end();
    
    return NextResponse.json({
      count: result.rowCount,
      wallets: result.rows.map(w => ({
        id: w.id,
        address: w.address?.slice(0, 15) + "...",
        status: w.status,
      })),
    });
  } catch (error: any) {
    await pool.end();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
