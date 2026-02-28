"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useState } from "react";

interface StepNameProps {
  onSubmit: (name: string) => void;
}

export function StepName({ onSubmit }: StepNameProps) {
  const [name, setName] = useState("");
  const trimmedName = name.trim();
  const canContinue = trimmedName.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full max-w-md flex-col justify-between gap-3"
    >
      <div className="rounded-xl border border-white/12 bg-white/[0.04] p-3 backdrop-blur-md">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <p className="text-sm font-medium text-white">Assistant identity</p>
        </div>
        <p className="text-xs text-white/60">Choose the name users will see in chat.</p>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jarvis, Friday, Ada"
          className="w-full rounded-xl border border-white/20 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 backdrop-blur-md transition-colors focus:border-cyan-300 focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && canContinue && onSubmit(trimmedName)}
        />

        {canContinue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 backdrop-blur-md"
          >
            <p className="text-xs text-white/75">
              Matt: Perfect. I&apos;ll introduce as <span className="font-semibold text-cyan-100">{trimmedName}</span>.
            </p>
          </motion.div>
        )}

        <button
          onClick={() => canContinue && onSubmit(trimmedName)}
          disabled={!canContinue}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.45)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
