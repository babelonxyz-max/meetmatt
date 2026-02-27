"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Rocket } from "lucide-react";
import Link from "next/link";

interface StepWelcomeProps {
  onStart: () => void;
}

export function StepWelcome({ onStart }: StepWelcomeProps) {
  return (
    <div className="max-w-2xl mx-auto text-center px-4 sm:px-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-[var(--foreground)]">
          Meet <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">Matt</span>!
        </h1>
        <p className="text-xl text-[var(--muted)] mb-8">
          Your guide to AI-superpowered Assistants
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-blue-500" />
            <span className="text-lg font-semibold text-[var(--foreground)]">What we&apos;ll create together:</span>
          </div>
          <ul className="space-y-3 text-left">
            {[
              "Your personal AI assistant powered by advanced AI",
              "Customized to your specific needs and workflow",
              "Available 24/7 on your preferred platform",
              "Deploys in minutes, not months",
            ].map((item, i) => (
              <motion.li 
                key={i} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-start gap-3 text-[var(--muted)]"
              >
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1, type: "spring" }}
                  className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" 
                />
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Fleet Mode CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mb-6"
      >
        <Link href="/fleet">
          <div className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 rounded-xl transition-all cursor-pointer">
            <Rocket className="w-5 h-5 text-amber-500" />
            <div className="text-left">
              <div className="text-sm font-medium text-amber-500">New: Fleet Mode</div>
              <div className="text-xs text-[var(--muted)]">Deploy 1000s of agents at once</div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={onStart}
        className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 flex items-center gap-3 mx-auto"
      >
        Let&apos;s Get Started
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </div>
  );
}
