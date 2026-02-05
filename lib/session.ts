const SESSION_KEY = "matt_session_id";
const PENDING_CONFIG_KEY = "matt_pending_config";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function savePendingConfig(config: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_CONFIG_KEY, JSON.stringify(config));
}

export function getPendingConfig(): any | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PENDING_CONFIG_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function clearPendingConfig() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_CONFIG_KEY);
}
