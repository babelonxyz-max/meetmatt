"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Send, Check } from "lucide-react";

interface StepExpectationsProps {
  agentName: string;
  onSubmit: (expectations: string[]) => void;
}

const suggestionOptions = [
  "Handle customer inquiries and support",
  "Schedule meetings and manage my calendar",
  "Answer emails and draft responses",
  "Research and summarize information",
  "Monitor tasks and send reminders",
  "Generate reports and analytics",
  "Qualify leads and manage CRM",
  "Process data and automate workflows",
];

export function StepExpectations({ agentName, onSubmit }: StepExpectationsProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");

  const toggleSelection = (option: string) => {
    setSelected((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = () => {
    const allExpectations = [...selected];
    if (customInput.trim()) {
      allExpectations.push(customInput.trim());
    }
    if (allExpectations.length > 0) {
      onSubmit(allExpectations);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto px-4 sm:px-0"
    >
      {/* Matt's Message - Blended, no box */}
      <div className="text-center mb-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl sm:text-2xl text-[var(--foreground)] leading-relaxed"
        >
          Great! Now, what do you expect from <span className="font-semibold text-blue-500">{agentName}</span>?
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-[var(--muted)] mt-3"
        >
          Select all that apply, or tell me something custom.
        </motion.p>
      </div>

      {/* Suggestions - Chip style, blended */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap justify-center gap-2 mb-8"
      >
        {suggestionOptions.map((option, i) => {
          const isSelected = selected.includes(option);
          return (
            <motion.button
              key={option}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              onClick={() => toggleSelection(option)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                  : "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] hover:border-blue-500/50 hover:bg-[var(--card-hover)]"
              }`}
            >
              <span className="flex items-center gap-2">
                {isSelected && <Check className="w-3.5 h-3.5" />}
                {option}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Custom Input - Minimal, blended */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="max-w-xl mx-auto mb-6"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Or type something else..."
            className="flex-1 px-5 py-3 bg-[var(--card)] border border-[var(--border)] rounded-full text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-blue-500 transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && customInput.trim()) {
                toggleSelection(customInput.trim());
                setCustomInput("");
              }
            }}
          />
          <button
            onClick={() => {
              if (customInput.trim()) {
                toggleSelection(customInput.trim());
                setCustomInput("");
              }
            }}
            disabled={!customInput.trim()}
            className="p-3 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-full transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Selected Items Display */}
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <p className="text-sm text-[var(--muted)] mb-3 text-center">Selected expectations:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {selected.map((item) => (
              <button
                key={item}
                onClick={() => toggleSelection(item)}
                className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-sm hover:bg-blue-500/20 transition-colors"
              >
                {item} ×
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center"
      >
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0 && !customInput.trim()}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25"
        >
          Continue →
        </button>
      </motion.div>
    </motion.div>
  );
}
