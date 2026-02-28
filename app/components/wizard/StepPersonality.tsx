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
      className="mx-auto max-w-2xl"
    >
      <div className="text-center mb-8">
        <h2 className="mb-2 text-3xl font-bold text-white">What&apos;s your style?</h2>
        <p className="text-white/65">Choose how your assistant will interact with you</p>
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
              className="rounded-xl border border-white/15 bg-white/[0.05] p-6 text-left shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all hover:border-cyan-300/40 hover:bg-white/[0.09]"
            >
              <div className="flex items-start gap-4">
                <div className={`rounded-lg p-3 ${p.accentBg}`}>
                  <Icon className={`h-6 w-6 ${p.accentText}`} />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-xl font-semibold text-white">{p.name}</h3>
                  <p className="mb-2 text-sm text-white/65">{p.description}</p>
                  <p className="text-sm italic text-white/50">&ldquo;{p.sample}&rdquo;</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
