"use client";

import { motion } from "framer-motion";
import { Briefcase, Heart, Zap } from "lucide-react";

interface StepPersonalityProps {
  onSelect: (personality: string) => void;
}

const personalities = [
  {
    id: "professional",
    name: "Professional",
    icon: Briefcase,
    description: "Formal, efficient, and business-focused",
    sample: "I'll handle your scheduling and prioritize your tasks effectively.",
    color: "blue",
  },
  {
    id: "friendly",
    name: "Friendly",
    icon: Heart,
    description: "Warm, casual, and supportive",
    sample: "Hey! I'm here to make your day easier. What can I help with?",
    color: "purple",
  },
  {
    id: "hustler",
    name: "Hustler",
    icon: Zap,
    description: "Fast, direct, and action-oriented",
    sample: "Let's get things done. What's the priority right now?",
    color: "amber",
  },
];

export function StepPersonality({ onSelect }: StepPersonalityProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">What&apos;s your style?</h2>
        <p className="text-gray-400">Choose how your assistant will interact with you</p>
      </div>

      <div className="grid gap-4">
        {personalities.map((p) => {
          const Icon = p.icon;
          return (
            <motion.button
              key={p.id}
              onClick={() => onSelect(p.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-6 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl text-left transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg bg-${p.color}-500/20`}>
                  <Icon className={`w-6 h-6 text-${p.color}-400`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1">{p.name}</h3>
                  <p className="text-gray-400 text-sm mb-2">{p.description}</p>
                  <p className="text-gray-500 text-sm italic">&ldquo;{p.sample}&rdquo;</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
