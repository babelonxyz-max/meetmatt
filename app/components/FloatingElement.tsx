"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
  delay?: number;
}

export function FloatingElement({
  children,
  className = "",
  duration = 3,
  distance = 10,
  delay = 0,
}: FloatingElementProps) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -distance, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

export function FloatingParticle({
  className = "",
  color = "cyan",
}: {
  className?: string;
  color?: "cyan" | "blue" | "purple" | "amber";
}) {
  const colors = {
    cyan: "bg-cyan-500/30",
    blue: "bg-blue-500/30",
    purple: "bg-purple-500/30",
    amber: "bg-amber-500/30",
  };

  return (
    <motion.div
      className={`absolute rounded-full ${colors[color]} ${className}`}
      animate={{
        y: [0, -30, 0],
        x: [0, 10, -10, 0],
        opacity: [0.3, 0.6, 0.3],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        ease: "easeInOut",
        delay: Math.random() * 2,
      }}
    />
  );
}
