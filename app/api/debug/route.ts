import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWalletPoolStats } from "@/lib/walletPool";

export async function GET() {
  try {
    // Try raw query
    const rawResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM wallet_pool`;
    const rawCount = Array.isArray(rawResult) ? rawResult[0]?.count : 0;
    
    const stats = await getWalletPoolStats();
    
    return NextResponse.json({
      status: "ok",
      rawCount,
      stats,
      env: {
        hasWalletEncryptionKey: !!process.env.WALLET_ENCRYPTION_KEY,
        hasMasterWallet: !!process.env.HYPEREVM_MASTER_WALLET,
        hasPMWalletKey: !!process.env.PM_WALLET_KEY,
        encryptionKeyLength: process.env.WALLET_ENCRYPTION_KEY?.length || 0,
        nodeEnv: process.env.NODE_ENV,
        nextPhase: process.env.NEXT_PHASE || "not set",
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: "error",
      error: error.message 
    }, { status: 500 });
  }
}
