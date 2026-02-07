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
    const wallets = [];
    for (let i = 1; i <= 5; i++) {
      const wallet = ethers.Wallet.createRandom();
      const encryptedKey = encryptPrivateKey(wallet.privateKey);
      
      await prisma.walletPool.create({
        data: {
          id: `wallet_${i}`,
          address: wallet.address,
          encryptedPrivateKey: encryptedKey,
          status: "available",
          pmApproved: false,
          hyperBalance: "0",
        },
      });
      
      wallets.push({
        id: `wallet_${i}`,
        address: wallet.address,
        privateKey: wallet.privateKey,
      });
    }
    
    return NextResponse.json({
      success: true,
      wallets,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}
