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
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    id: "friendly",
    name: "Friendly",
    icon: Heart,
    description: "Warm, casual, and supportive",
    sample: "Hey! I'm here to make your day easier. What can I help with?",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
  },
  {
    id: "hustler",
    name: "Hustler",
    icon: Zap,
    description: "Fast, direct, and action-oriented",
    sample: "Let's get things done. What's the priority right now?",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
  },
];

export function StepPersonality({ onSelect }: StepPersonalityProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 sm:px-0"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-[var(--foreground)]">What&apos;s your style?</h2>
        <p className="text-[var(--muted)]">Choose how your assistant will interact with you</p>
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
              className="p-6 bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] hover:border-[var(--accent)]/50 rounded-xl text-left transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${p.iconBg}`}>
                  <Icon className={`w-6 h-6 ${p.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1 text-[var(--foreground)]">{p.name}</h3>
                  <p className="text-[var(--muted)] text-sm mb-2">{p.description}</p>
                  <p className="text-[var(--muted)]/70 text-sm italic">&ldquo;{p.sample}&rdquo;</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
