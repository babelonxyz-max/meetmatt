"use client";

import { ReactNode } from "react";

interface FormLabelProps {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
}

export function FormLabel({
  htmlFor,
  children,
  required = false,
  optional = false,
  className = "",
}: FormLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-slate-300 mb-1.5 ${className}`}
    >
      {children}
      {required && (
        <span className="text-red-400 ml-1" aria-hidden="true">
          *
        </span>
      )}
      {required && (
        <span className="sr-only">(required)</span>
      )}
      {optional && (
        <span className="text-slate-500 ml-1 font-normal">
          (optional)
        </span>
      )}
    </label>
  );
}
