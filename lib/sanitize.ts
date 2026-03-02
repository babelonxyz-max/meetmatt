/**
 * Input sanitization utilities
 */

// HTML entities to escape
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Remove all HTML tags
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize agent name
 * - Remove special characters
 * - Limit length
 * - Trim whitespace
 */
export function sanitizeAgentName(name: string): string {
  return name
    .trim()
    .slice(0, 50) // Max 50 chars
    .replace(/[<>\"']/g, "") // Remove dangerous chars
    .replace(/[^\w\s-]/g, "") // Allow only alphanumeric, spaces, hyphens
    .trim();
}

/**
 * Sanitize slug
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .slice(0, 100)
    .replace(/[^a-z0-9-]/g, "-") // Replace invalid chars with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Sanitize email
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .slice(0, 254)
    .replace(/[<>\"']/g, "");
}

/**
 * Sanitize generic text
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ""); // Basic XSS prevention
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string, allowedProtocols: string[] = ["https:"]): string | null {
  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Check if string is valid CUID
 */
export function isValidCuid(id: string): boolean {
  return /^c[a-z0-9]{24}$/.test(id);
}

/**
 * Validate UUID
 */
export function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Deep sanitize object
 */
export function deepSanitize<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeText(value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = deepSanitize(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}
