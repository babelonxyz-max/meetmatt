"use client";

import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "ghost" | "outline";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { icon, label, size = "md", variant = "default", className = "", ...props },
    ref
  ) => {
    const sizes = {
      sm: "w-8 h-8",
      md: "w-10 h-10",
      lg: "w-12 h-12",
    };

    const iconSizes = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    const variants = {
      default:
        "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white",
      ghost: "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200",
      outline:
        "border border-slate-700 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400",
    };

    return (
      <button
        ref={ref}
        className={`
          ${sizes[size]}
          ${variants[variant]}
          rounded-lg flex items-center justify-center
          transition-all duration-200
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-cyan-500/50
          ${className}
        `}
        aria-label={label}
        {...props}
      >
        <span className={iconSizes[size]}>{icon}</span>
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
