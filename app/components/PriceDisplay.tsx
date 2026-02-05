"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  interval?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSavings?: boolean;
  className?: string;
}

export function PriceDisplay({
  price,
  originalPrice,
  currency = "USD",
  interval,
  size = "md",
  showSavings = true,
  className = "",
}: PriceDisplayProps) {
  const savings = originalPrice ? originalPrice - price : 0;
  const savingsPercent = originalPrice
    ? Math.round((savings / originalPrice) * 100)
    : 0;

  const sizes = {
    sm: { price: "text-2xl", original: "text-sm", interval: "text-xs" },
    md: { price: "text-4xl", original: "text-lg", interval: "text-sm" },
    lg: { price: "text-5xl", original: "text-xl", interval: "text-base" },
    xl: { price: "text-6xl", original: "text-2xl", interval: "text-lg" },
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-baseline gap-3">
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`font-bold text-cyan-400 ${sizes[size].price}`}
        >
          {formatCurrency(price, currency)}
        </motion.span>
        
        {originalPrice && (
          <span
            className={`text-slate-500 line-through ${sizes[size].original}`}
          >
            {formatCurrency(originalPrice, currency)}
          </span>
        )}
        
        {interval && (
          <span className={`text-slate-500 ${sizes[size].interval}`}>
            /{interval}
          </span>
        )}
      </div>
      
      {showSavings && savings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-2"
        >
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
            Save {formatCurrency(savings, currency)} ({savingsPercent}% OFF)
          </span>
        </motion.div>
      )}
    </div>
  );
}
