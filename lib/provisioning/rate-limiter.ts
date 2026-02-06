// Security and Input Validation for Meet Matt
// Handles input sanitization and content safety checks

import { DEFAULT_LIMITS } from "./types";

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
  
  const unsafePatterns: RegExp[] = [
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
 * Get default service limits
 */
export function getServiceLimits() {
  return DEFAULT_LIMITS;
}
