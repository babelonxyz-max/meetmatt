"use client";

import { useRef, ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { IconButton } from "./IconButton";

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  className?: string;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  description,
  size = "md",
  showCloseButton = true,
  className = "",
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = description
    ? `modal-desc-${Math.random().toString(36).substr(2, 9)}`
    : undefined;

  useLockBodyScroll(isOpen);
  useFocusTrap(modalRef, isOpen);
  const prefersReducedMotion = useReducedMotion();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className={`
              fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
              ${sizes[size]}
              w-full md:w-[calc(100%-2rem)]
              max-h-[calc(100vh-2rem)]
              bg-slate-900 rounded-2xl border border-slate-800
              shadow-2xl z-50 overflow-hidden flex flex-col
              ${className}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <h2 id={titleId} className="text-xl font-semibold text-slate-100">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="text-sm text-slate-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <IconButton
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  }
                  label="Close modal"
                  onClick={onClose}
                  variant="ghost"
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
