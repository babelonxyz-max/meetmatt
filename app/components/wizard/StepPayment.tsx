"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Check, Wallet } from "lucide-react";

interface StepPaymentProps {
  agentName: string;
  onContinue: () => void;
}

export function StepPayment({ agentName, onContinue }: StepPaymentProps) {
  const [accepted, setAccepted] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full max-w-md flex-col gap-3"
    >
      <div className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 backdrop-blur-md">
        <p className="text-sm font-medium text-white">Deploy {agentName}</p>
        <p className="mt-1 text-xs text-white/60">Quick confirmation before payment.</p>
      </div>

      {/* Pricing Card */}
      <div className="rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold text-white">$150</span>
          <span className="text-xs text-white/70">setup month</span>
        </div>
        <p className="mt-1 text-xs text-white/70">$99/month after launch</p>
        <ul className="mt-3 grid gap-2 text-xs">
          {[
            "Unlimited messages",
            "Telegram integration",
            "Custom personality",
            "24/7 availability",
            "Production deployment",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-white/85">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Terms */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/12 bg-white/[0.05] p-3 backdrop-blur-md">
        <input 
          type="checkbox" 
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent"
        />
        <span className="text-xs text-white/70">
          I understand this creates a Telegram bot via Devin AI. 
          Setup takes 2-5 minutes.
        </span>
      </label>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        disabled={!accepted}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 p-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.45)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Wallet className="h-4 w-4" />
        Proceed to Payment
      </button>
    </motion.div>
  );
}
