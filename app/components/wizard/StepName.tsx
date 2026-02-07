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
      className="max-w-md mx-auto text-center"
    >
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2">What should I call you?</h2>
        <p className="text-gray-400">This will be your AI assistant&apos;s name</p>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jarvis, Friday, Ada"
          className="w-full px-6 py-4 bg-gray-900 border border-gray-700 rounded-xl text-xl text-center focus:outline-none focus:border-blue-500 transition-colors"
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onSubmit(name.trim())}
        />
        
        {name.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-gray-900/50 rounded-xl border border-gray-800"
          >
            <p className="text-gray-400 text-sm mb-1">Preview:</p>
            <p className="text-lg">
              &ldquo;Hi! I&apos;m <span className="text-blue-400 font-semibold">{name}</span>. 
              I&apos;ll help you stay organized and productive.&rdquo;
            </p>
          </motion.div>
        )}

        <button
          onClick={() => name.trim() && onSubmit(name.trim())}
          disabled={!name.trim()}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-xl font-semibold transition-colors"
        >
          Continue →
        </button>
      </div>
    </motion.div>
  );
}
