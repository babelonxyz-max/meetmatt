"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  hover = false,
  glow = false,
  onClick,
}: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={`
        relative rounded-xl bg-slate-900/50 border border-slate-800/50
        backdrop-blur-sm overflow-hidden
        ${hover ? "cursor-pointer" : ""}
        ${glow ? "hover:shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-500/30" : ""}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-6 py-4 border-b border-slate-800/50 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-6 py-4 border-t border-slate-800/50 ${className}`}>
      {children}
    </div>
  );
}
