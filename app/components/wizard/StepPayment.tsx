"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Check, Wallet, Shield } from "lucide-react";

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
      className="max-w-lg mx-auto px-4 sm:px-0"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2 text-[var(--foreground)]">
          Ready to deploy {agentName}?
        </h2>
        <p className="text-[var(--muted)]">
          One-time setup fee + first month included
        </p>
      </div>

      {/* Pricing Card */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-[var(--border)] rounded-2xl p-6 mb-6">
        <div className="text-center mb-4">
          <span className="text-5xl font-bold text-[var(--foreground)]">$150</span>
          <p className="text-[var(--muted)] mt-1">Setup + First Month</p>
        </div>
        
        <div className="border-t border-[var(--border)] pt-4">
          <p className="text-sm text-[var(--muted)] mb-3">What&apos;s included:</p>
          <ul className="space-y-2">
            {[
              "AI Agent deployment via Devin",
              "Telegram bot setup & configuration",
              "Custom personality & capabilities",
              "1 month of unlimited usage",
              "Dashboard access for management",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <Check className="w-4 h-4 text-green-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 p-3 bg-[var(--background)] rounded-xl">
          <p className="text-xs text-[var(--muted)] text-center">
            After first month: $99/month • Cancel anytime
          </p>
        </div>
      </div>

      {/* Security Note */}
      <div className="flex items-center gap-3 p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] mb-4">
        <Shield className="w-5 h-5 text-green-500 flex-shrink-0" />
        <p className="text-sm text-[var(--muted)]">
          Secure payment powered by cryptocurrency. Your agent will be deployed within 2-5 minutes after payment.
        </p>
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 p-4 bg-[var(--card)] rounded-xl cursor-pointer mb-4 border border-[var(--border)]">
        <input 
          type="checkbox" 
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-[var(--border)] bg-[var(--background)] text-blue-500 focus:ring-blue-500"
        />
        <span className="text-sm text-[var(--muted)]">
          I understand this creates a Telegram bot via Devin AI and agree to the terms of service.
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

      <p className="text-center text-xs text-[var(--muted)] mt-4">
        🔒 Secure crypto payment. No credit card required.
      </p>
    </motion.div>
  );
}
