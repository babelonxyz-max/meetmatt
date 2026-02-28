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
    accentBg: "bg-cyan-300/25",
    accentText: "text-cyan-200",
  },
  {
    id: "friendly",
    name: "Friendly",
    icon: Heart,
    description: "Warm, casual, and supportive",
    sample: "Hey! I'm here to make your day easier. What can I help with?",
    accentBg: "bg-violet-300/25",
    accentText: "text-violet-200",
  },
  {
    id: "hustler",
    name: "Hustler",
    icon: Zap,
    description: "Fast, direct, and action-oriented",
    sample: "Let's get things done. What's the priority right now?",
    accentBg: "bg-amber-300/25",
    accentText: "text-amber-200",
  },
];

export function StepPersonality({ onSelect }: StepPersonalityProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full max-w-2xl flex-col gap-3"
    >
      <div className="rounded-xl border border-white/12 bg-white/[0.04] p-3 backdrop-blur-md">
        <p className="text-sm font-medium text-white">Interaction style</p>
        <p className="mt-1 text-xs text-white/60">Pick how Matt should communicate by default.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {personalities.map((p) => {
          const Icon = p.icon;
          return (
            <motion.button
              key={p.id}
              onClick={() => onSelect(p.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className="rounded-xl border border-white/15 bg-white/[0.05] p-3 text-left shadow-[0_10px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all hover:border-cyan-300/40 hover:bg-white/[0.09]"
            >
              <div className="flex items-start gap-2">
                <div className={`rounded-lg p-2 ${p.accentBg}`}>
                  <Icon className={`h-4 w-4 ${p.accentText}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                  <p className="mt-1 text-xs text-white/65">{p.description}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="px-1 text-xs italic text-white/50">
        Matt adapts dynamically in demo chat, even after this selection.
      </p>
    </motion.div>
  );
}
