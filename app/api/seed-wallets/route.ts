import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers } from "ethers";
import crypto from "crypto";

export async function POST() {
  try {
    // Check database URL
    const dbUrl = process.env.DATABASE_URL || "not set";
    const dbUrlMasked = dbUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@");
    
    // Test connection
    let connectionTest = "not tested";
    try {
      await prisma.$connect();
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      connectionTest = "success: " + JSON.stringify(result);
    } catch (e: any) {
      connectionTest = "failed: " + e.message;
    }
    
    // Check if we can write
    let writeTest = "not tested";
    try {
      const wallet = ethers.Wallet.createRandom();
      const encryptedKey = "test:" + crypto.randomBytes(32).toString("hex");
      
      const created = await prisma.walletPool.create({
        data: {
          id: `test_${Date.now()}`,
          address: wallet.address,
          encryptedPrivateKey: encryptedKey,
          status: "available",
          pmApproved: false,
          hyperBalance: "0",
        },
      });
      
      writeTest = "success: created " + created.id;
      
      // Verify it was written
      const verify = await prisma.walletPool.findUnique({
        where: { id: created.id }
      });
      
      writeTest += verify ? " (verified)" : " (NOT FOUND!)";
      
    } catch (e: any) {
      writeTest = "failed: " + e.message;
    }
    
    return NextResponse.json({
      dbUrl: dbUrlMasked,
      connectionTest,
      writeTest,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
