"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CopyToClipboardProps {
  text: string;
  children: ReactNode;
  className?: string;
  onCopy?: () => void;
  successMessage?: string;
}

export function CopyToClipboard({
  text,
  children,
  className = "",
  onCopy,
  successMessage = "Copied!",
}: CopyToClipboardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setShowTooltip(true);
      onCopy?.();
      setTimeout(() => setShowTooltip(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`relative ${className}`}
      aria-label="Copy to clipboard"
    >
      {children}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg whitespace-nowrap"
          >
            {successMessage}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-emerald-500 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
