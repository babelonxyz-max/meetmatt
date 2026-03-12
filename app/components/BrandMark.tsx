"use client";

import { useId } from "react";

interface BrandMonogramProps {
  className?: string;
  glow?: boolean;
}

interface BrandMarkProps {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  glow?: boolean;
  stacked?: boolean;
  iconOnly?: boolean;
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function BrandMonogram({ className = "", glow = false }: BrandMonogramProps) {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 80 64"
      fill="none"
      aria-hidden="true"
      className={cx(
        "shrink-0",
        glow && "drop-shadow-[0_0_28px_rgba(255,107,53,0.55)]",
        className
      )}
    >
      <defs>
        <linearGradient id={gradientId} x1="18" y1="14" x2="62" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B35" />
          <stop offset="1" stopColor="#FFAA44" />
        </linearGradient>
      </defs>
      <path
        d="M18 54V18c0-4.16 4.77-6.61 8.17-4.18L40 25.24l13.83-11.42C57.23 11.39 62 13.84 62 18v36"
        stroke={`url(#${gradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 54V24l22 17.5L62 24v30"
        stroke={`url(#${gradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandMark({
  className = "",
  iconClassName = "",
  wordmarkClassName = "",
  glow = false,
  stacked = false,
  iconOnly = false,
}: BrandMarkProps) {
  return (
    <div
      className={cx(
        "inline-flex items-center",
        stacked ? "flex-col items-start gap-2" : "gap-3",
        className
      )}
    >
      <BrandMonogram
        glow={glow}
        className={cx(stacked ? "h-10 w-10" : "h-8 w-8", iconClassName)}
      />
      {iconOnly ? null : (
        <span
          className={cx(
            "brand-wordmark text-[1.6rem] font-semibold text-[var(--foreground)]",
            stacked && "text-[1.9rem] leading-none",
            glow && "drop-shadow-[0_0_18px_rgba(255,107,53,0.35)]",
            wordmarkClassName
          )}
        >
          Meet Matt
        </span>
      )}
    </div>
  );
}
