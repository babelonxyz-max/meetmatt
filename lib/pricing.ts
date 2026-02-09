// Unified Pricing System - MeetMatt
// Simple: $150/month or $1000/year (33% discount)

export interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number; // Special annual pricing
  features: string[];
}

export interface PricingOption {
  months: number;
  label: string;
  price: number;
  pricePerMonth: number;
  savings: number;
  isPopular?: boolean;
}

// Base tier configuration
export const TIERS: Record<string, PricingTier> = {
  matt: {
    id: "matt",
    name: "Matt Plan",
    monthlyPrice: 150,
    annualPrice: 1000,
    features: [
      "1 AI agent",
      "Full feature access",
      "Telegram integration",
      "Priority support",
      "Custom prompts",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro Plan",
    monthlyPrice: 300,
    annualPrice: 2000,
    features: [
      "3 AI agents",
      "Full feature access",
      "All integrations",
      "Priority support",
      "Custom training",
      "API access",
    ],
  },
};

/**
 * Calculate pricing for a given tier and duration
 * Only discount is annual: $1000 instead of $1800
 */
export function calculatePricing(tierId: string, months: number): PricingOption {
  const tier = TIERS[tierId] || TIERS.matt;
  
  // Annual pricing (12 months)
  if (months === 12) {
    const savings = (tier.monthlyPrice * 12) - tier.annualPrice;
    return {
      months: 12,
      label: "Annual (Best Value)",
      price: tier.annualPrice,
      pricePerMonth: Math.round(tier.annualPrice / 12),
      savings,
      isPopular: true,
    };
  }
  
  // Monthly pricing (default to 1 month if not 12)
  const clampedMonths = Math.max(1, Math.min(months, 12));
  const price = tier.monthlyPrice * clampedMonths;
  
  return {
    months: clampedMonths,
    label: clampedMonths === 1 ? "Monthly" : `${clampedMonths} Months`,
    price,
    pricePerMonth: tier.monthlyPrice,
    savings: 0,
  };
}

/**
 * Get all pricing options for a tier
 */
export function getPricingOptions(tierId: string): PricingOption[] {
  const tier = TIERS[tierId] || TIERS.matt;
  
  return [
    {
      months: 1,
      label: "Monthly",
      price: tier.monthlyPrice,
      pricePerMonth: tier.monthlyPrice,
      savings: 0,
    },
    {
      months: 12,
      label: "Annual",
      price: tier.annualPrice,
      pricePerMonth: Math.round(tier.annualPrice / 12),
      savings: (tier.monthlyPrice * 12) - tier.annualPrice,
      isPopular: true,
    },
  ];
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Get IPN callback URL for payments
 */
export function getIpnCallbackUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meetmatt.xyz";
  // Ensure valid HTTPS URL for NowPayments
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  return `${cleanBaseUrl}/api/webhooks/payment`;
}
