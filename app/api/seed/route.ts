import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
  try {
    // Count before
    const before = await prisma.walletPool.count();
    
    // Create 5 wallets
    const created = [];
    for (let i = 1; i <= 5; i++) {
      const wallet = ethers.Wallet.createRandom();
      const encryptedKey = encryptPrivateKey(wallet.privateKey);
      
      const w = await prisma.walletPool.create({
        data: {
          id: `wallet_${Date.now()}_${i}`,
          address: wallet.address,
          encryptedPrivateKey: encryptedKey,
          status: "available",
          pmApproved: false,
          hyperBalance: "0",
        },
      });
      
      created.push(w.id);
    }
    
    // Count after  
    const after = await prisma.walletPool.count();
    
    // List all wallets
    const all = await prisma.walletPool.findMany({
      select: { id: true, address: true, status: true },
      take: 10,
    });
    
    return NextResponse.json({
      before,
      after,
      created,
      all: all.map(w => ({ id: w.id, address: w.address.slice(0, 10) + "...", status: w.status })),
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack?.split("\n")[0],
    }, { status: 500 });
  }
}
