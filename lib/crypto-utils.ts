import { timingSafeEqual, createHash } from "crypto";

/**
 * Timing-safe string comparison.
 * Hashes both inputs with SHA-256 so different-length strings
 * don't short-circuit and comparison time is constant.
 * Returns false if either value is falsy.
 */
export function safeCompare(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) return false;
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
