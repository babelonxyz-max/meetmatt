"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCountdown } from "../hooks/useCountdown";

interface UrgencyBannerProps {
  offerEndDate: Date;
  originalPrice: number;
  currentPrice: number;
  className?: string;
}

export function UrgencyBanner({
  offerEndDate,
  originalPrice,
  currentPrice,
  className = "",
}: UrgencyBannerProps) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(offerEndDate);
  const [showBanner, setShowBanner] = useState(true);

  if (isExpired || !showBanner) return null;

  const savings = originalPrice - currentPrice;
  const savingsPercent = Math.round((savings / originalPrice) * 100);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className={`bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/30 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-400">
            <span className="text-lg">🔥</span>
            <span className="font-semibold">
              Limited Time Offer: Save ${savings} ({savingsPercent}% OFF)
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-slate-400">Ends in:</span>
              <div className="flex gap-1 font-mono text-amber-400">
                <TimeUnit value={days} label="d" />
                <span>:</span>
                <TimeUnit value={hours} label="h" />
                <span>:</span>
                <TimeUnit value={minutes} label="m" />
                <span>:</span>
                <TimeUnit value={seconds} label="s" />
              </div>
            </div>
            
            <button
              onClick={() => setShowBanner(false)}
              className="text-slate-500 hover:text-slate-400 transition-colors"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <span className="bg-slate-900/50 px-1.5 py-0.5 rounded">
      {String(value).padStart(2, "0")}
      <span className="text-xs text-slate-500 ml-0.5">{label}</span>
    </span>
  );
}
