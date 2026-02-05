"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface RatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

export function Rating({
  value,
  max = 5,
  size = "md",
  interactive = false,
  onChange,
  className = "",
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const displayValue = hoverValue ?? value;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= displayValue;

        return (
          <motion.button
            key={i}
            type="button"
            whileHover={interactive ? { scale: 1.2 } : undefined}
            whileTap={interactive ? { scale: 0.9 } : undefined}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHoverValue(starValue)}
            onMouseLeave={() => interactive && setHoverValue(null)}
            disabled={!interactive}
            className={`${sizes[size]} ${interactive ? "cursor-pointer" : "cursor-default"}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill={isFilled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              className={`w-full h-full ${isFilled ? "text-amber-400" : "text-slate-600"}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </motion.button>
        );
      })}
    </div>
  );
}
