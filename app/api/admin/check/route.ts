import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const tokenFromEnv = process.env.ADMIN_AUTH_TOKEN || "not-set";
  
  return NextResponse.json({
    receivedAuthHeader: authHeader,
    expectedPrefix: "Bearer ",
    envTokenFirst10: tokenFromEnv.substring(0, 10) + "...",
    envTokenLength: tokenFromEnv.length,
    match: authHeader === `Bearer ${tokenFromEnv}`,
  });
}
