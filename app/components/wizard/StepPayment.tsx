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
      className="max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Ready to deploy {agentName}?</h2>
        <p className="text-gray-400">Review and confirm</p>
      </div>

      {/* Pricing Card */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
        <div className="text-center">
          <span className="text-4xl font-bold">$150</span>
          <span className="text-gray-400"> first month</span>
          <p className="text-sm text-gray-400 mt-2">Includes setup • $99/month after</p>
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
              <span className="text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 p-4 bg-gray-900 rounded-xl cursor-pointer mb-4">
        <input 
          type="checkbox" 
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-gray-700"
        />
        <span className="text-sm text-gray-400">
          I understand this creates a Telegram bot via Devin AI. 
          Setup takes 2-5 minutes.
        </span>
      </label>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        disabled={!accepted}
        className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
      >
        <Wallet className="w-5 h-5" />
        Proceed to Payment
      </button>

      <p className="text-center text-sm text-gray-500 mt-6">
        You&apos;ll complete payment on the next step
      </p>
    </motion.div>
  );
}
