import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RateLimiter } from "./api-middleware";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

interface RateLimitChecker {
  check(identifier: string): Promise<RateLimitResult>;
}

// Create a rate limiter that uses Upstash Redis if configured, falls back to in-memory
export function createRateLimiter(config: { requests: number; windowMs: number }): RateLimitChecker {
  const hasUpstash = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

  if (hasUpstash) {
    const redis = Redis.fromEnv();
    const windowStr = `${Math.floor(config.windowMs / 1000)} s` as const;
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, windowStr),
    });
    return {
      async check(identifier: string): Promise<RateLimitResult> {
        const result = await limiter.limit(identifier);
        return { success: result.success, remaining: result.remaining, reset: result.reset };
      },
    };
  }

  // Fallback to in-memory (best-effort on serverless)
  const memLimiter = new RateLimiter(config.requests, config.windowMs);
  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const result = memLimiter.check(identifier);
      return { success: result.allowed, remaining: result.remaining, reset: result.resetAt };
    },
  };
}

// Pre-configured limiters
export const verifyLimiter = createRateLimiter({ requests: 5, windowMs: 60000 });
export const adminLimiter = createRateLimiter({ requests: 10, windowMs: 60000 });
export const paymentLimiter = createRateLimiter({ requests: 10, windowMs: 60000 });
