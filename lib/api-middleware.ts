import { NextRequest, NextResponse } from "next/server";
import { AppError, formatError, getStatusCode } from "./errors";

export interface ApiContext {
  params?: Record<string, string>;
}

export type ApiHandler = (
  req: NextRequest,
  ctx: ApiContext
) => Promise<NextResponse> | NextResponse;

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, ctx: ApiContext) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    try {
      const response = await handler(req, ctx);
      
      // Add response time header
      response.headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
      response.headers.set("X-Request-ID", requestId);
      
      return response;
    } catch (error: any) {
      console.error(`[API Error] [${requestId}]`, error);
      
      const statusCode = getStatusCode(error);
      const errorResponse = formatError(error);
      
      return NextResponse.json(
        { ...errorResponse, requestId },
        { 
          status: statusCode,
          headers: {
            "X-Response-Time": `${Date.now() - startTime}ms`,
            "X-Request-ID": requestId,
          }
        }
      );
    }
  };
}

/**
 * Simple in-memory rate limiter
 */
export class RateLimiter {
  private requests = new Map<string, { count: number; resetAt: number }>();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);
    
    if (!entry || now > entry.resetAt) {
      // New window
      const resetAt = now + this.windowMs;
      this.requests.set(identifier, { count: 1, resetAt });
      return { allowed: true, remaining: this.maxRequests - 1, resetAt };
    }
    
    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }
    
    entry.count++;
    return { allowed: true, remaining: this.maxRequests - entry.count, resetAt: entry.resetAt };
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();

/**
 * Middleware to add rate limiting
 */
export function withRateLimit(
  handler: ApiHandler,
  limiter: RateLimiter = globalRateLimiter
): ApiHandler {
  return async (req: NextRequest, ctx: ApiContext) => {
    const clientId = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    const result = limiter.check(clientId);
    
    if (!result.allowed) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          code: "RATE_LIMIT",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(limiter["maxRequests"]),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
          }
        }
      );
    }
    
    const response = await handler(req, ctx);
    
    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", String(limiter["maxRequests"]));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
    
    return response;
  };
}

/**
 * Middleware to add CORS headers
 */
export function withCors(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, ctx: ApiContext) => {
    // Handle preflight
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    
    const response = await handler(req, ctx);
    
    response.headers.set("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_APP_URL || "*");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    
    return response;
  };
}

/**
 * Combine multiple middlewares
 */
export function compose(...middlewares: ((handler: ApiHandler) => ApiHandler)[]): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
