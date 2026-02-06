import { NextRequest, NextResponse } from "next/server";
import { privyClient } from "@/lib/privy";
import { prisma } from "@/lib/prisma";

/**
 * Verify Privy token and get/create user
 * This is called after user logs in with Privy
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    
    // Verify token with Privy
    const userData = await privyClient.getUser(token);
    
    if (!userData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get or create user in database
    let user = await prisma.user.findUnique({
      where: { privyId: userData.id },
    });

    const walletAccount = userData.linkedAccounts?.find((a: any) => a.type === "wallet");
    const walletAddress = userData.wallet?.address || (walletAccount as any)?.address;

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          privyId: userData.id,
          email: userData.email?.address || null,
          walletAddress: walletAddress || null,
          name: (userData as any).name || null,
          avatar: (userData as any).avatar || null,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Update last login
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          // Update email/wallet if changed
          ...(userData.email?.address && { email: userData.email.address }),
          ...(walletAddress && { walletAddress }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        privyId: user.privyId,
        email: user.email,
        walletAddress: user.walletAddress,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[Auth] Verification failed:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
