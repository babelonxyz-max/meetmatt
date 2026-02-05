"use client";

import { motion } from "framer-motion";

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gradient" | "striped";
  showLabel?: boolean;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  size = "md",
  variant = "gradient",
  showLabel = false,
  className = "",
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizes = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const variants = {
    default: "bg-cyan-500",
    gradient: "bg-gradient-to-r from-cyan-500 to-blue-500",
    striped:
      "bg-gradient-to-r from-cyan-500 to-blue-500 bg-[length:20px_20px] animate-progress-stripes",
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`w-full bg-slate-800 rounded-full overflow-hidden ${sizes[size]}`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full rounded-full ${variants[variant]}`}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>{Math.round(percentage)}%</span>
          <span>
            {value}/{max}
          </span>
        </div>
      )}
    </div>
  );
}
