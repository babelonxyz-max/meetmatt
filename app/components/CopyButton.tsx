"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useToast } from "./Toast";

interface CopyButtonProps {
  text: string;
  className?: string;
  showToast?: boolean;
  toastMessage?: string;
}

export function CopyButton({
  text,
  className = "",
  showToast = true,
  toastMessage = "Copied to clipboard!",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (showToast) {
        toast(toastMessage, "success");
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast("Failed to copy", "error");
    }
  };

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors ${className}`}
      aria-label="Copy to clipboard"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Check className="w-4 h-4 text-green-400" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Copy className="w-4 h-4 text-zinc-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
