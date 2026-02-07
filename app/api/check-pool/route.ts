import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const wallets = await prisma.walletPool.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    
    return NextResponse.json({
      count: wallets.length,
      wallets: wallets.map(w => ({
        id: w.id,
        address: w.address.slice(0, 15) + "...",
        status: w.status,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
