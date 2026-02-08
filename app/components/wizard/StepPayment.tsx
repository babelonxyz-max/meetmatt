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
      className="max-w-md mx-auto px-4 sm:px-0"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-white">Ready to deploy {agentName}?</h2>
        <p className="text-zinc-400">Review and confirm</p>
      </div>

      {/* Pricing Card */}
      <div className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
        <div className="text-center">
          <span className="text-4xl font-bold text-white">$150</span>
          <span className="text-zinc-400"> first month</span>
          <p className="text-sm text-zinc-400 mt-2">Includes setup • $99/month after</p>
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
              <span className="text-white">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 p-4 bg-zinc-900/80 rounded-xl cursor-pointer mb-4 border border-zinc-800">
        <input 
          type="checkbox" 
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800"
        />
        <span className="text-sm text-zinc-400">
          I understand this creates a Telegram bot via Devin AI. 
          Setup takes 2-5 minutes.
        </span>
      </label>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        disabled={!accepted}
        className="w-full p-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
      >
        <Wallet className="w-5 h-5" />
        Proceed to Payment
      </button>

      <p className="text-center text-sm text-zinc-500 mt-6">
        You&apos;ll complete payment on the next step
      </p>
    </motion.div>
  );
}
