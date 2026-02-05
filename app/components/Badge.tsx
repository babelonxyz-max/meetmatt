"use client";

import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "premium";
  size?: "sm" | "md";
  className?: string;
  pulse?: boolean;
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
  pulse = false,
}: BadgeProps) {
  const variants = {
    default: "bg-slate-800 text-slate-300 border-slate-700",
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
    info: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    premium: "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${variants[variant]}
        ${sizes[size]}
        ${pulse ? "animate-pulse" : ""}
        ${className}
      `}
    >
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
