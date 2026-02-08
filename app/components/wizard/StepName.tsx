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
      className="max-w-md mx-auto text-center px-4 sm:px-0"
    >
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2 text-[var(--foreground)]">What should I call you?</h2>
        <p className="text-[var(--muted)]">This will be your AI assistant&apos;s name</p>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jarvis, Friday, Ada"
          className="w-full px-6 py-4 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xl text-center text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onSubmit(name.trim())}
        />
        
        {name.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)]"
          >
            <p className="text-[var(--muted)] text-sm mb-1">Preview:</p>
            <p className="text-lg text-[var(--foreground)]">
              &ldquo;Hi! I&apos;m <span className="text-blue-500 font-semibold">{name}</span>. 
              I&apos;ll help you stay organized and productive.&rdquo;
            </p>
          </motion.div>
        )}

        <button
          onClick={() => name.trim() && onSubmit(name.trim())}
          disabled={!name.trim()}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25"
        >
          Continue →
        </button>
      </div>
    </motion.div>
  );
}
