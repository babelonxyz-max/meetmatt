// Rate Limiting System for Meet Matt
// Prevents abuse and enforces tier-based limits

import { RateLimits, TIER_LIMITS } from "./types";

interface RateLimitEntry {
  count: number;
  windowStart: number;
  lastRequest: number;
}

// In-memory rate limit storage (would use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Window duration (24 hours for daily limits)
const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000;

// Request cooldown (minimum time between requests)
const MIN_REQUEST_INTERVAL_MS = 1000; // 1 second

/**
 * Check if a request is allowed under rate limits
 */
export function checkRateLimit(
  userId: string,
  tier: "basic" | "pro" | "enterprise"
): { allowed: boolean; remaining: number; resetAt: Date; error?: string } {
  const limits = TIER_LIMITS[tier];
  const now = Date.now();
  
  // Get or create entry
  let entry = rateLimitStore.get(userId);
  
  if (!entry) {
    entry = {
      count: 0,
      windowStart: now,
      lastRequest: 0,
    };
  }
  
  // Check if window has expired
  if (now - entry.windowStart > WINDOW_DURATION_MS) {
    // Reset window
    entry = {
      count: 0,
      windowStart: now,
      lastRequest: entry.lastRequest,
    };
  }
  
  // Check request cooldown (anti-spam)
  if (now - entry.lastRequest < MIN_REQUEST_INTERVAL_MS) {
    return {
      allowed: false,
      remaining: limits.messagesPerDay === -1 ? -1 : limits.messagesPerDay - entry.count,
      resetAt: new Date(entry.windowStart + WINDOW_DURATION_MS),
      error: "Too many requests. Please wait a moment.",
    };
  }
  
  // Check daily limit (skip if unlimited)
  if (limits.messagesPerDay !== -1 && entry.count >= limits.messagesPerDay) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.windowStart + WINDOW_DURATION_MS),
      error: `Daily limit reached (${limits.messagesPerDay} messages). Resets at ${new Date(entry.windowStart + WINDOW_DURATION_MS).toISOString()}`,
    };
  }
  
  // Allow request and update entry
  entry.count++;
  entry.lastRequest = now;
  rateLimitStore.set(userId, entry);
  
  return {
    allowed: true,
    remaining: limits.messagesPerDay === -1 ? -1 : limits.messagesPerDay - entry.count,
    resetAt: new Date(entry.windowStart + WINDOW_DURATION_MS),
  };
}

/**
 * Get current usage stats for a user
 */
export function getUsageStats(
  userId: string,
  tier: "basic" | "pro" | "enterprise"
): { used: number; limit: number; remaining: number; resetAt: Date } {
  const limits = TIER_LIMITS[tier];
  const entry = rateLimitStore.get(userId);
  const now = Date.now();
  
  if (!entry || now - entry.windowStart > WINDOW_DURATION_MS) {
    return {
      used: 0,
      limit: limits.messagesPerDay,
      remaining: limits.messagesPerDay,
      resetAt: new Date(now + WINDOW_DURATION_MS),
    };
  }
  
  return {
    used: entry.count,
    limit: limits.messagesPerDay,
    remaining: limits.messagesPerDay === -1 ? -1 : limits.messagesPerDay - entry.count,
    resetAt: new Date(entry.windowStart + WINDOW_DURATION_MS),
  };
}

/**
 * Reset rate limits for a user (admin function)
 */
export function resetRateLimits(userId: string): void {
  rateLimitStore.delete(userId);
}

/**
 * Input validation and sanitization
 */
export function validateAndSanitizeInput(input: string): { 
  valid: boolean; 
  sanitized: string; 
  error?: string 
} {
  // Check for empty input
  if (!input || input.trim().length === 0) {
    return { valid: false, sanitized: "", error: "Message cannot be empty" };
  }
  
  // Check max length
  const MAX_MESSAGE_LENGTH = 4000;
  if (input.length > MAX_MESSAGE_LENGTH) {
    return { 
      valid: false, 
      sanitized: "", 
      error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` 
    };
  }
  
  // Sanitize input
  let sanitized = input
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Trim whitespace
    .trim();
  
  // Check for potential prompt injection patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/i,
    /disregard\s+(all\s+)?(previous|above|prior)/i,
    /you\s+are\s+now\s+/i,
    /new\s+instructions?:/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /<<SYS>>/i,
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      // Don't reject, but log for monitoring
      console.warn(`Potential injection attempt detected: ${sanitized.slice(0, 100)}`);
      // Could add to a blocklist or flag for review
    }
  }
  
  return { valid: true, sanitized };
}

/**
 * Check if content is potentially harmful
 */
export function checkContentSafety(content: string): { 
  safe: boolean; 
  reason?: string 
} {
  // Basic content safety checks
  // In production, would use a proper content moderation API
  
  const unsafePatterns = [
    // Explicit harmful content patterns would go here
    // This is a simplified example
  ];
  
  for (const pattern of unsafePatterns) {
    if (pattern.test(content)) {
      return { safe: false, reason: "Content flagged for review" };
    }
  }
  
  return { safe: true };
}

/**
 * IP-based rate limiting for API endpoints
 */
const ipRateLimits = new Map<string, { count: number; windowStart: number }>();
const IP_RATE_LIMIT = 60; // requests per minute
const IP_WINDOW_MS = 60 * 1000; // 1 minute

export function checkIPRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  let entry = ipRateLimits.get(ip);
  
  if (!entry || now - entry.windowStart > IP_WINDOW_MS) {
    entry = { count: 0, windowStart: now };
  }
  
  if (entry.count >= IP_RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.windowStart + IP_WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  ipRateLimits.set(ip, entry);
  
  return { allowed: true };
}
