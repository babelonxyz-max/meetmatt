"use client";

import { forwardRef, InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helper,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <div className={`${fullWidth ? "w-full" : ""}`}>
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              block w-full rounded-lg bg-slate-900/50 border
              ${error ? "border-red-500/50 focus:border-red-500" : "border-slate-700 focus:border-cyan-500/50"}
              text-slate-100 placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-cyan-500/20
              transition-all duration-200
              ${leftIcon ? "pl-10" : "pl-4"}
              ${rightIcon ? "pr-10" : "pr-4"}
              py-2.5
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
        {helper && !error && (
          <p className="mt-1.5 text-sm text-slate-500">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
