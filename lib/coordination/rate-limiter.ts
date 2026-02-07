// API Provider Rate Limiter for Lorely Swarm
// Manages rate limiting across multiple API providers with automatic failover

import { APIProvider, ProviderRateLimit } from "./types";

/**
 * Token bucket rate limiter for API providers
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number, refillRatePerSecond: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRatePerSecond;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens, returns true if successful
   */
  tryConsume(count: number): boolean {
    this.refill();
    
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    
    return false;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Time until tokens are available
   */
  timeUntilAvailable(count: number): number {
    this.refill();
    
    if (this.tokens >= count) {
      return 0;
    }
    
    const needed = count - this.tokens;
    return (needed / this.refillRate) * 1000; // milliseconds
  }
}

/**
 * Provider rate limit state
 */
interface ProviderState {
  provider: APIProvider;
  requestBucket: TokenBucket;
  tokenBucket: TokenBucket;
  consecutiveErrors: number;
  lastError?: string;
  lastErrorAt?: Date;
  disabledUntil?: Date;
}

/**
 * API Rate Limiter - manages rate limits across multiple providers
 */
export class APIRateLimiter {
  private providers: Map<string, ProviderState> = new Map();
  private requestQueue: QueuedRequest[] = [];
  private processing: boolean = false;

  constructor() {
    // Start queue processor
    setInterval(() => this.processQueue(), 100);
  }

  /**
   * Register an API provider
   */
  registerProvider(provider: APIProvider): void {
    const state: ProviderState = {
      provider,
      // Default: 60 requests per minute = 1 per second
      requestBucket: new TokenBucket(
        provider.rateLimit?.requestsPerMinute || 60,
        (provider.rateLimit?.requestsPerMinute || 60) / 60
      ),
      // Default: 100k tokens per minute
      tokenBucket: new TokenBucket(
        provider.rateLimit?.tokensPerMinute || 100000,
        (provider.rateLimit?.tokensPerMinute || 100000) / 60
      ),
      consecutiveErrors: 0,
    };

    this.providers.set(provider.name, state);
    console.log(`[RateLimiter] Registered provider: ${provider.name}`);
  }

  /**
   * Get the best available provider
   */
  getBestProvider(estimatedTokens: number = 1000): APIProvider | null {
    const now = new Date();
    const available: ProviderState[] = [];

    for (const state of this.providers.values()) {
      // Skip disabled providers
      if (state.disabledUntil && state.disabledUntil > now) {
        continue;
      }

      // Skip providers with too many errors
      if (state.consecutiveErrors >= 3) {
        continue;
      }

      // Check if provider has capacity
      if (
        state.requestBucket.getTokens() >= 1 &&
        state.tokenBucket.getTokens() >= estimatedTokens
      ) {
        available.push(state);
      }
    }

    if (available.length === 0) {
      return null;
    }

    // Sort by priority (lower = better)
    available.sort((a, b) => a.provider.priority - b.provider.priority);
    
    return available[0].provider;
  }

  /**
   * Try to acquire rate limit for a request
   */
  async tryAcquire(
    providerName: string,
    estimatedTokens: number
  ): Promise<{ acquired: boolean; waitMs?: number }> {
    const state = this.providers.get(providerName);
    
    if (!state) {
      return { acquired: false };
    }

    // Check if disabled
    if (state.disabledUntil && state.disabledUntil > new Date()) {
      const waitMs = state.disabledUntil.getTime() - Date.now();
      return { acquired: false, waitMs };
    }

    // Try to consume from both buckets
    if (
      state.requestBucket.tryConsume(1) &&
      state.tokenBucket.tryConsume(estimatedTokens)
    ) {
      return { acquired: true };
    }

    // Calculate wait time
    const requestWait = state.requestBucket.timeUntilAvailable(1);
    const tokenWait = state.tokenBucket.timeUntilAvailable(estimatedTokens);
    const waitMs = Math.max(requestWait, tokenWait);

    return { acquired: false, waitMs };
  }

  /**
   * Report successful request
   */
  reportSuccess(providerName: string, actualTokens: number): void {
    const state = this.providers.get(providerName);
    
    if (state) {
      state.consecutiveErrors = 0;
      state.lastError = undefined;
      state.lastErrorAt = undefined;
      
      // Adjust token bucket if we used more than estimated
      // (already consumed during tryAcquire, so this is just for tracking)
    }
  }

  /**
   * Report failed request
   */
  reportError(providerName: string, error: string, isRateLimit: boolean): void {
    const state = this.providers.get(providerName);
    
    if (state) {
      state.consecutiveErrors++;
      state.lastError = error;
      state.lastErrorAt = new Date();

      if (isRateLimit) {
        // Disable for exponential backoff
        const backoffMs = Math.min(
          60000 * Math.pow(2, state.consecutiveErrors - 1),
          300000 // Max 5 minutes
        );
        state.disabledUntil = new Date(Date.now() + backoffMs);
        console.log(
          `[RateLimiter] Provider ${providerName} rate limited, disabled for ${backoffMs}ms`
        );
      }
    }
  }

  /**
   * Get provider status
   */
  getProviderStatus(providerName: string): {
    available: boolean;
    requestsAvailable: number;
    tokensAvailable: number;
    errors: number;
    disabledUntil?: Date;
  } | null {
    const state = this.providers.get(providerName);
    
    if (!state) {
      return null;
    }

    const now = new Date();
    const isDisabled = state.disabledUntil && state.disabledUntil > now;

    return {
      available: !isDisabled && state.consecutiveErrors < 3,
      requestsAvailable: Math.floor(state.requestBucket.getTokens()),
      tokensAvailable: Math.floor(state.tokenBucket.getTokens()),
      errors: state.consecutiveErrors,
      disabledUntil: state.disabledUntil,
    };
  }

  /**
   * Get all provider statuses
   */
  getAllStatuses(): Map<string, ReturnType<typeof this.getProviderStatus>> {
    const statuses = new Map();
    
    for (const name of this.providers.keys()) {
      statuses.set(name, this.getProviderStatus(name));
    }
    
    return statuses;
  }

  /**
   * Queue a request for processing
   */
  queueRequest(request: QueuedRequest): void {
    this.requestQueue.push(request);
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      const request = this.requestQueue[0];
      const provider = this.getBestProvider(request.estimatedTokens);

      if (provider) {
        const result = await this.tryAcquire(provider.name, request.estimatedTokens);
        
        if (result.acquired) {
          this.requestQueue.shift();
          request.callback(provider);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}

interface QueuedRequest {
  id: string;
  estimatedTokens: number;
  callback: (provider: APIProvider) => void;
  queuedAt: Date;
}

// Singleton instance
let rateLimiterInstance: APIRateLimiter | null = null;

export function getRateLimiter(): APIRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new APIRateLimiter();
  }
  return rateLimiterInstance;
}

export function resetRateLimiter(): void {
  rateLimiterInstance = null;
}
