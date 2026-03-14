import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/internal-auth";
import { adminLimiter } from "@/lib/rate-limit";

function readClientId(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function requireAdminApiRequest(
  request: NextRequest,
): Promise<NextResponse | null> {
  const rateCheck = await adminLimiter.check(readClientId(request));

  if (!rateCheck.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateCheck.reset - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  if (!process.env.ADMIN_AUTH_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "Admin auth not configured" },
      { status: 503 },
    );
  }

  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
