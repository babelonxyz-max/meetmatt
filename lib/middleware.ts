import { NextRequest, NextResponse } from "next/server";

// Rate limiting map (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  maxRequests: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
) {
  return async (request: NextRequest) => {
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();

    const current = rateLimitMap.get(key);

    if (!current || now > current.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return null;
    }

    if (current.count >= maxRequests) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    current.count++;
    return null;
  };
}

// Security headers middleware
export function securityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.devin.ai;"
  );
  return response;
}

// CORS middleware
export function cors(response: NextResponse, origin?: string): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}
