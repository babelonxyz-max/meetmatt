import { NextRequest, NextResponse } from "next/server";
import { safeCompare } from "@/lib/crypto-utils";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_AUTH_TOKEN;
  if (!secret) return false;
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return safeCompare(token, secret);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gateway status is queried from the gateway process itself.
  // This route proxies to the gateway's /status endpoint.
  const gatewayUrl = process.env.CORTEX_GATEWAY_URL;
  if (!gatewayUrl) {
    return NextResponse.json(
      {
        status: "not_configured",
        message: "CORTEX_GATEWAY_URL not set",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${gatewayUrl}/status`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "unhealthy", httpStatus: response.status },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json({ status: "healthy", gateway: data });
  } catch (error) {
    console.error("[Cortex/Status] Gateway unreachable:", error);
    return NextResponse.json(
      { status: "unreachable", error: "Gateway not responding" },
      { status: 502 },
    );
  }
}
