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
      className="mx-auto max-w-md"
    >
      <div className="text-center mb-8">
        <h2 className="mb-2 text-3xl font-bold text-white">Ready to deploy {agentName}?</h2>
        <p className="text-white/65">Review and confirm</p>
      </div>

      {/* Pricing Card */}
      <div className="mb-6 rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="text-center">
          <span className="text-4xl font-bold">$150</span>
          <span className="text-white/65"> first month</span>
          <p className="mt-2 text-sm text-white/65">Includes setup • $99/month after</p>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {[
            "Unlimited messages",
            "Telegram integration", 
            "Custom personality",
            "24/7 availability",
            "Devin-powered deployment",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-white/85">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Terms */}
      <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
        <input 
          type="checkbox" 
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent"
        />
        <span className="text-sm text-white/70">
          I understand this creates a Telegram bot via Devin AI. 
          Setup takes 2-5 minutes.
        </span>
      </label>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        disabled={!accepted}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 p-4 font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.45)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Wallet className="w-5 h-5" />
        Proceed to Payment
      </button>

      <p className="mt-6 text-center text-sm text-white/50">
        You&apos;ll complete payment on the next step
      </p>
    </motion.div>
  );
}
