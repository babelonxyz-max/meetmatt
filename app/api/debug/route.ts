import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ? "Set" : "Missing",
    privyAppIdLength: process.env.NEXT_PUBLIC_PRIVY_APP_ID?.length || 0,
    privyAppIdPrefix: process.env.NEXT_PUBLIC_PRIVY_APP_ID?.substring(0, 10) + "...",
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
