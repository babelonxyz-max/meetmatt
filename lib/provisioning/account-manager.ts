// Telegram Account Manager with Fallback Support
// Manages multiple Telegram accounts for bot creation with automatic failover

import { TelegramCreatorAccount, AccountHealthAlert } from "./types";

// In-memory storage (would use database in production)
const accountStore = new Map<string, TelegramCreatorAccount>();
const alertQueue: AccountHealthAlert[] = [];

// Alert callback - will be set by the system to notify admin
let alertCallback: ((alert: AccountHealthAlert) => Promise<void>) | null = null;

/**
 * Register the alert callback for notifying admin of account issues
 */
export function setAlertCallback(callback: (alert: AccountHealthAlert) => Promise<void>): void {
  alertCallback = callback;
}

/**
 * Add a Telegram account for bot creation
 */
export function addCreatorAccount(account: TelegramCreatorAccount): void {
  accountStore.set(account.id, account);
  console.log(`[AccountManager] Added account ${account.id} (${account.phone}) with priority ${account.priority}`);
}

/**
 * Get all accounts sorted by priority
 */
export function getAccountsByPriority(): TelegramCreatorAccount[] {
  return Array.from(accountStore.values())
    .filter(a => a.status === "active")
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get the next available account for bot creation
 * Tries primary first, then fallbacks in order of priority
 */
export function getNextAvailableAccount(): TelegramCreatorAccount | null {
  const accounts = getAccountsByPriority();
  
  if (accounts.length === 0) {
    // No active accounts - send critical alert
    sendAlert({
      accountId: "system",
      phone: "N/A",
      status: "unknown",
      error: "No active Telegram accounts available for bot creation",
      timestamp: new Date(),
      requiresAction: true,
    });
    return null;
  }
  
  return accounts[0];
}

/**
 * Mark an account as having an issue
 */
export function markAccountIssue(
  accountId: string, 
  status: TelegramCreatorAccount["status"],
  error: string
): void {
  const account = accountStore.get(accountId);
  if (!account) return;
  
  account.status = status;
  account.lastError = error;
  accountStore.set(accountId, account);
  
  console.log(`[AccountManager] Account ${accountId} marked as ${status}: ${error}`);
  
  // Send alert to admin
  sendAlert({
    accountId,
    phone: account.phone,
    status,
    error,
    timestamp: new Date(),
    requiresAction: status === "banned" || status === "locked",
  });
  
  // Check if we need to warn about low account availability
  const activeAccounts = getAccountsByPriority();
  if (activeAccounts.length === 0) {
    sendAlert({
      accountId: "system",
      phone: "N/A",
      status: "unknown",
      error: "CRITICAL: All Telegram accounts are unavailable. Bot creation is disabled.",
      timestamp: new Date(),
      requiresAction: true,
    });
  } else if (activeAccounts.length === 1) {
    sendAlert({
      accountId: "system",
      phone: "N/A",
      status: "unknown",
      error: `WARNING: Only 1 active account remaining (${activeAccounts[0].phone}). Please add a new fallback account.`,
      timestamp: new Date(),
      requiresAction: true,
    });
  }
}

/**
 * Mark an account as healthy/active
 */
export function markAccountHealthy(accountId: string): void {
  const account = accountStore.get(accountId);
  if (!account) return;
  
  account.status = "active";
  account.lastError = undefined;
  account.lastUsed = new Date();
  accountStore.set(accountId, account);
  
  console.log(`[AccountManager] Account ${accountId} marked as active`);
}

/**
 * Increment bot creation count for an account
 */
export function incrementBotCount(accountId: string): void {
  const account = accountStore.get(accountId);
  if (!account) return;
  
  account.createdBots++;
  account.lastUsed = new Date();
  accountStore.set(accountId, account);
}

/**
 * Send an alert to the admin
 */
async function sendAlert(alert: AccountHealthAlert): Promise<void> {
  alertQueue.push(alert);
  console.log(`[ALERT] ${alert.error}`);
  
  if (alertCallback) {
    try {
      await alertCallback(alert);
    } catch (error) {
      console.error("[AccountManager] Failed to send alert:", error);
    }
  }
}

/**
 * Get all pending alerts
 */
export function getPendingAlerts(): AccountHealthAlert[] {
  return [...alertQueue];
}

/**
 * Clear alerts after they've been acknowledged
 */
export function clearAlerts(): void {
  alertQueue.length = 0;
}

/**
 * Get account status summary
 */
export function getAccountStatus(): {
  total: number;
  active: number;
  locked: number;
  banned: number;
  accounts: Array<{
    id: string;
    phone: string;
    status: string;
    priority: number;
    createdBots: number;
    lastUsed?: Date;
  }>;
} {
  const accounts = Array.from(accountStore.values());
  
  return {
    total: accounts.length,
    active: accounts.filter(a => a.status === "active").length,
    locked: accounts.filter(a => a.status === "locked").length,
    banned: accounts.filter(a => a.status === "banned").length,
    accounts: accounts.map(a => ({
      id: a.id,
      phone: a.phone,
      status: a.status,
      priority: a.priority,
      createdBots: a.createdBots,
      lastUsed: a.lastUsed,
    })),
  };
}

/**
 * Try to create a bot using available accounts with automatic failover
 */
export async function tryCreateBotWithFailover(
  createBotFn: (account: TelegramCreatorAccount) => Promise<{ success: boolean; error?: string; token?: string; username?: string }>
): Promise<{ success: boolean; accountId?: string; token?: string; username?: string; error?: string }> {
  const accounts = getAccountsByPriority();
  
  if (accounts.length === 0) {
    return { 
      success: false, 
      error: "No active Telegram accounts available for bot creation" 
    };
  }
  
  for (const account of accounts) {
    console.log(`[AccountManager] Trying account ${account.id} (${account.phone})...`);
    
    try {
      const result = await createBotFn(account);
      
      if (result.success) {
        incrementBotCount(account.id);
        markAccountHealthy(account.id);
        return {
          success: true,
          accountId: account.id,
          token: result.token,
          username: result.username,
        };
      }
      
      // Check if error indicates account issue
      const errorLower = (result.error || "").toLowerCase();
      if (errorLower.includes("banned") || errorLower.includes("deactivated")) {
        markAccountIssue(account.id, "banned", result.error || "Account banned");
      } else if (errorLower.includes("flood") || errorLower.includes("too many")) {
        markAccountIssue(account.id, "locked", result.error || "Rate limited");
      } else {
        // Temporary error, don't mark account as bad
        console.log(`[AccountManager] Account ${account.id} failed with temporary error: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`[AccountManager] Account ${account.id} threw exception:`, error);
      // Don't mark as bad for exceptions - could be network issues
    }
  }
  
  return {
    success: false,
    error: "All accounts failed to create bot. Check alerts for details.",
  };
}

/**
 * Initialize with default accounts from environment
 */
export function initializeFromEnv(): void {
  // Primary account
  const primaryPhone = process.env.TELEGRAM_PHONE;
  const primaryApiId = process.env.TELEGRAM_API_ID;
  const primaryApiHash = process.env.TELEGRAM_API_HASH;
  
  if (primaryPhone && primaryApiId && primaryApiHash) {
    addCreatorAccount({
      id: "primary",
      phone: primaryPhone,
      apiId: parseInt(primaryApiId),
      apiHash: primaryApiHash,
      sessionFile: process.env.TELEGRAM_SESSION || "/home/ubuntu/.telegram_session",
      status: "active",
      priority: 0,
      createdBots: 0,
    });
  }
  
  // Fallback accounts (TELEGRAM_FALLBACK_1_*, TELEGRAM_FALLBACK_2_*, etc.)
  for (let i = 1; i <= 5; i++) {
    const phone = process.env[`TELEGRAM_FALLBACK_${i}_PHONE`];
    const apiId = process.env[`TELEGRAM_FALLBACK_${i}_API_ID`];
    const apiHash = process.env[`TELEGRAM_FALLBACK_${i}_API_HASH`];
    
    if (phone && apiId && apiHash) {
      addCreatorAccount({
        id: `fallback_${i}`,
        phone,
        apiId: parseInt(apiId),
        apiHash,
        sessionFile: process.env[`TELEGRAM_FALLBACK_${i}_SESSION`] || `/home/ubuntu/.telegram_session_fb${i}`,
        status: "active",
        priority: i,
        createdBots: 0,
      });
    }
  }
  
  const status = getAccountStatus();
  console.log(`[AccountManager] Initialized with ${status.total} accounts (${status.active} active)`);
}
