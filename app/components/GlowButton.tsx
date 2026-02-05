"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlowButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  glowColor?: string;
}

export function GlowButton({
  children,
  className = "",
  onClick,
  glowColor = "rgba(6, 182, 212, 0.5)",
}: GlowButtonProps) {
  return (
    <motion.button
      className={`relative ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="absolute -inset-1 rounded-lg blur-md opacity-0"
        style={{ background: glowColor }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
      <span className="relative">{children}</span>
    </motion.button>
  );
}
