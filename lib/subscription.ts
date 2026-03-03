// Subscription lifecycle utilities for MeetMatt
// Manages activation, expiration checks, and period calculations

/**
 * Add months to a date without importing date-fns.
 * Handles month overflow (e.g., Jan 31 + 1 month = Feb 28).
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);

  // Handle overflow: if the day changed, we overshot (e.g., Jan 31 -> Mar 3)
  // Roll back to the last day of the intended month
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0); // Sets to last day of previous month
  }

  return result;
}

/**
 * Build Prisma update data for activating a subscription.
 * Returns a plain object suitable for `prisma.agent.update({ data: ... })`.
 */
export function activateSubscription(paymentType: "monthly" | "annual"): {
  subscriptionStatus: string;
  subscriptionType: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
} {
  const now = new Date();
  const months = paymentType === "annual" ? 12 : 1;

  return {
    subscriptionStatus: "active",
    subscriptionType: paymentType,
    currentPeriodStart: now,
    currentPeriodEnd: addMonths(now, months),
    cancelAtPeriodEnd: false,
  };
}

/**
 * Check whether an agent's subscription has expired.
 * Returns true if currentPeriodEnd is in the past.
 */
export function isExpired(agent: {
  currentPeriodEnd: Date | null;
  subscriptionStatus: string;
}): boolean {
  if (!agent.currentPeriodEnd) return false;
  return new Date() > new Date(agent.currentPeriodEnd);
}

/**
 * Calculate days remaining until currentPeriodEnd.
 * Returns 0 if already expired or no end date set.
 */
export function daysUntilExpiry(agent: {
  currentPeriodEnd: Date | null;
}): number {
  if (!agent.currentPeriodEnd) return 0;
  const now = new Date();
  const end = new Date(agent.currentPeriodEnd);
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
