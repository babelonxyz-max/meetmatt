// CONTROL Admin Panel Authentication
// Simple session-based auth for admin access

const ADMIN_USERNAME = "Latamapac";
const ADMIN_PASSWORD_HASH = "latamapac"; // In production, use proper hashing

export interface AdminSession {
  username: string;
  role: "owner" | "admin" | "viewer";
  expiresAt: number;
}

export function validateCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD_HASH;
}

export function createSession(username: string): AdminSession {
  return {
    username,
    role: username === ADMIN_USERNAME ? "owner" : "admin",
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
}

export function verifySession(session: AdminSession | null): boolean {
  if (!session) return false;
  if (session.expiresAt < Date.now()) return false;
  return true;
}
