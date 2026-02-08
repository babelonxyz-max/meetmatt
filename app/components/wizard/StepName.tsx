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
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
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
          className="w-full px-6 py-4 bg-[var(--card)] border border-[var(--border)] rounded-xl text-xl text-center text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
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
              &ldquo;Hi! I&apos;m <span className="text-[var(--accent)] font-semibold">{name}</span>. 
              I&apos;ll help you stay organized and productive.&rdquo;
            </p>
          </motion.div>
        )}

        <button
          onClick={() => name.trim() && onSubmit(name.trim())}
          disabled={!name.trim()}
          className="w-full py-4 bg-[var(--accent)] hover:opacity-90 disabled:bg-[var(--card)] disabled:text-[var(--muted)] text-white rounded-xl font-semibold transition-all shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/30 disabled:shadow-none"
        >
          Continue →
        </button>
      </div>
    </motion.div>
  );
}
