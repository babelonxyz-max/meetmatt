"use client";

const SESSION_KEY = "matt_session_id";
const PENDING_CONFIG_KEY = "matt_pending_config";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    // Server-side: return a temporary ID that will be replaced client-side
    return "server-temp-" + Math.random().toString(36).substr(2, 9);
  }
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId || sessionId.startsWith("server-temp-")) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export interface PendingConfig {
  agentName: string;
  purpose: string;
  features: string[];
  tier: "starter" | "pro" | "enterprise";
  createdAt: number;
}

export function savePendingConfig(config: PendingConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_CONFIG_KEY, JSON.stringify(config));
}

export function getPendingConfig(): PendingConfig | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PENDING_CONFIG_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as PendingConfig;
  } catch {
    return null;
  }
}

export function clearPendingConfig() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_CONFIG_KEY);
}
