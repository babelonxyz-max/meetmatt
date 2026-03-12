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
    badge: "Client-safe",
    description: "Calm, sharp, and built for work threads.",
    sample: "I've already sorted the schedule conflict and drafted the next update.",
    accent: "text-[#ffd9b4]",
  },
  {
    id: "friendly",
    name: "Friendly",
    icon: Heart,
    badge: "Warm default",
    description: "Warm, easy to trust, and naturally conversational.",
    sample: "Hey, I sorted the basics already. Want me to take care of the next part too?",
    accent: "text-[#ffc89b]",
  },
  {
    id: "hustler",
    name: "Hustler",
    icon: Zap,
    badge: "Fastest tone",
    description: "Direct, urgent, and made for operators who move fast.",
    sample: "Done. Next move is obvious. Confirm and I will push it through.",
    accent: "text-amber-200",
  },
];

export function StepPersonality({ onSelect }: StepPersonalityProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full w-full max-w-3xl flex-col"
    >
      <div className="grid gap-2.5 lg:grid-cols-3">
        {personalities.map((personality) => {
          const Icon = personality.icon;

          return (
            <motion.button
              key={personality.id}
              type="button"
              onClick={() => onSelect(personality.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              className="wizard-option-card p-4 text-left"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.14),rgba(255,170,68,0.08)_30%,rgba(16,18,28,0.96)_100%)]">
                  <Icon className={`h-4.5 w-4.5 ${personality.accent}`} />
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-white/55">
                  {personality.badge}
                </span>
              </div>

              <h3 className="mt-4 text-[1.25rem] font-medium tracking-tight text-white sm:text-[1.45rem]">
                {personality.name}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/62 sm:text-sm">
                {personality.description}
              </p>

              <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/16 px-3 py-2.5 text-xs italic leading-relaxed text-white/74 sm:text-sm">
                &quot;{personality.sample}&quot;
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
