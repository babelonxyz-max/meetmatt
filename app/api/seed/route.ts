import { NextResponse } from "next/server";
import { Pool } from "pg";
import { ethers } from "ethers";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || "";

function encryptPrivateKey(privateKey: string): string {
  const key = ENCRYPTION_KEY.slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key), iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export async function POST() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }
  
  const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Count before
    const beforeResult = await pool.query("SELECT COUNT(*) as c FROM wallet_pool");
    const before = parseInt(beforeResult.rows[0].c);
    
    // Create 5 wallets using raw SQL
    const created = [];
    for (let i = 1; i <= 5; i++) {
      const wallet = ethers.Wallet.createRandom();
      const encryptedKey = encryptPrivateKey(wallet.privateKey);
      const id = `wallet_${Date.now()}_${i}`;
      
      await pool.query(
        `INSERT INTO wallet_pool (id, address, encrypted_private_key, status, pm_approved, hyper_balance, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [id, wallet.address, encryptedKey, "available", false, "0"]
      );
      
      created.push(id);
    }
    
    // Count after
    const afterResult = await pool.query("SELECT COUNT(*) as c FROM wallet_pool");
    const after = parseInt(afterResult.rows[0].c);
    
    // List all
    const allResult = await pool.query(
      "SELECT id, address, status FROM wallet_pool ORDER BY created_at DESC LIMIT 10"
    );
    
    await pool.end();
    
    return NextResponse.json({
      before,
      after,
      created,
      all: allResult.rows.map((w: any) => ({ 
        id: w.id, 
        address: w.address?.slice(0, 10) + "...", 
        status: w.status 
      })),
    });
  } catch (error: any) {
    await pool.end();
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
