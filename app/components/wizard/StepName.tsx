"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useState } from "react";

interface StepNameProps {
  onSubmit: (name: string) => void;
}

export function StepName({ onSubmit }: StepNameProps) {
  const [name, setName] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md text-center"
    >
      <div className="mb-8">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-600 shadow-[0_0_35px_rgba(59,130,246,0.5)]">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="mb-2 text-3xl font-bold text-white">What should I call you?</h2>
        <p className="text-white/65">This will be your AI assistant&apos;s name</p>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jarvis, Friday, Ada"
          className="w-full rounded-xl border border-white/20 bg-white/[0.06] px-6 py-4 text-center text-xl text-white placeholder:text-white/35 backdrop-blur-md transition-colors focus:border-cyan-300 focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onSubmit(name.trim())}
        />

        {name.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-white/15 bg-white/[0.05] p-4 backdrop-blur-md"
          >
            <p className="mb-1 text-sm text-white/60">Preview:</p>
            <p className="text-lg text-white/90">
              &ldquo;Hi! I&apos;m <span className="font-semibold text-cyan-200">{name}</span>.
              I&apos;ll help you stay organized and productive.&rdquo;
            </p>
          </motion.div>
        )}

        <button
          onClick={() => name.trim() && onSubmit(name.trim())}
          disabled={!name.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 py-4 font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.45)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue →
        </button>
      </div>
    </motion.div>
  );
}
