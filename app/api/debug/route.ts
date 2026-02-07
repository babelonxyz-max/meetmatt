import { NextResponse } from "next/server";
import { getWalletPoolStats } from "@/lib/walletPool";

export async function GET() {
  try {
    const stats = await getWalletPoolStats();
    return NextResponse.json({
      status: "ok",
      stats,
      env: {
        hasWalletEncryptionKey: !!process.env.WALLET_ENCRYPTION_KEY,
        hasMasterWallet: !!process.env.HYPEREVM_MASTER_WALLET,
        hasPMWalletKey: !!process.env.PM_WALLET_KEY,
        encryptionKeyLength: process.env.WALLET_ENCRYPTION_KEY?.length || 0,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: "error",
      error: error.message 
    }, { status: 500 });
  }
}
