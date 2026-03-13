export const DEFAULT_MONTHLY_LAUNCH_PRICE_USD = 150;
export const DEFAULT_DAY_PASS_PRICE_USD = 5;

export type LaunchPricingSource = "default" | "override" | "waived";
export type LaunchPricingPurchaseType = "subscription" | "day_pass";

export interface UserLaunchPricingInput {
  monthlyLaunchFeeUsd?: number | null;
  dayPassLaunchFeeUsd?: number | null;
  monthlyLaunchFeeWaived?: boolean | null;
  dayPassLaunchFeeWaived?: boolean | null;
}

export interface ResolvedUserLaunchPricing {
  monthlyPriceUsd: number;
  dayPassPriceUsd: number;
  monthlySource: LaunchPricingSource;
  dayPassSource: LaunchPricingSource;
  monthlyCardCheckoutEnabled: boolean;
  dayPassCardCheckoutEnabled: boolean;
}

function roundUsdAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeOptionalUsdAmount(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value < 0) {
    return null;
  }

  return roundUsdAmount(value);
}

function resolvePrice(params: {
  overrideAmount: number | null;
  defaultAmount: number;
  waived: boolean;
}) {
  if (params.waived || params.overrideAmount === 0) {
    return {
      amount: 0,
      source: "waived" as const,
      cardCheckoutEnabled: true,
    };
  }

  if (params.overrideAmount !== null) {
    return {
      amount: params.overrideAmount,
      source: "override" as const,
      cardCheckoutEnabled: params.overrideAmount === params.defaultAmount,
    };
  }

  return {
    amount: params.defaultAmount,
    source: "default" as const,
    cardCheckoutEnabled: true,
  };
}

export function resolveUserLaunchPricing(
  input?: UserLaunchPricingInput | null,
): ResolvedUserLaunchPricing {
  const monthly = resolvePrice({
    overrideAmount: normalizeOptionalUsdAmount(input?.monthlyLaunchFeeUsd),
    defaultAmount: DEFAULT_MONTHLY_LAUNCH_PRICE_USD,
    waived: input?.monthlyLaunchFeeWaived === true,
  });
  const dayPass = resolvePrice({
    overrideAmount: normalizeOptionalUsdAmount(input?.dayPassLaunchFeeUsd),
    defaultAmount: DEFAULT_DAY_PASS_PRICE_USD,
    waived: input?.dayPassLaunchFeeWaived === true,
  });

  return {
    monthlyPriceUsd: monthly.amount,
    dayPassPriceUsd: dayPass.amount,
    monthlySource: monthly.source,
    dayPassSource: dayPass.source,
    monthlyCardCheckoutEnabled: monthly.cardCheckoutEnabled,
    dayPassCardCheckoutEnabled: dayPass.cardCheckoutEnabled,
  };
}

export function getLaunchPriceForPurchaseType(
  pricing: ResolvedUserLaunchPricing,
  purchaseType: LaunchPricingPurchaseType,
): number {
  return purchaseType === "day_pass"
    ? pricing.dayPassPriceUsd
    : pricing.monthlyPriceUsd;
}

export function isCardCheckoutEnabledForPurchaseType(
  pricing: ResolvedUserLaunchPricing,
  purchaseType: LaunchPricingPurchaseType,
): boolean {
  return purchaseType === "day_pass"
    ? pricing.dayPassCardCheckoutEnabled
    : pricing.monthlyCardCheckoutEnabled;
}
