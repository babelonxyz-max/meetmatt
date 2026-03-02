"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Check, Wallet } from "lucide-react";

interface StepPaymentProps {
  agentName: string;
  deploymentMode: "assistant" | "fleet";
  onDeploymentModeChange: (mode: "assistant" | "fleet") => void;
  onContinue: () => void;
}

export function StepPayment({ agentName, deploymentMode, onDeploymentModeChange, onContinue }: StepPaymentProps) {
  const [accepted, setAccepted] = useState(false);
  const isFleet = deploymentMode === "fleet";

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

      <div className="mb-4 rounded-xl border border-white/12 bg-white/[0.05] p-2 backdrop-blur-md">
        <p className="mb-2 px-2 text-xs uppercase tracking-[0.14em] text-white/55">Deployment Mode</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onDeploymentModeChange("assistant")}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              !isFleet ? "bg-cyan-500/30 text-cyan-100 border border-cyan-300/40" : "bg-white/[0.04] text-white/70 border border-white/10"
            }`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => onDeploymentModeChange("fleet")}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              isFleet ? "bg-violet-500/30 text-violet-100 border border-violet-300/40" : "bg-white/[0.04] text-white/70 border border-white/10"
            }`}
          >
            Fleet
          </button>
        </div>
        <p className="mt-2 px-2 text-xs text-white/55">
          {isFleet
            ? "Fleet mode prepares multi-agent orchestration setup after checkout."
            : "Single mode deploys one assistant instance."}
        </p>
      </div>

      {/* Pricing Card */}
      <div className="mb-6 rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="text-center">
          <span className="text-4xl font-bold">$150</span>
          <span className="text-white/65"> first month</span>
          <p className="mt-2 text-sm text-white/65">Includes setup • $150/month after</p>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {[
            "Unlimited messages",
            "Telegram integration",
            "Custom personality",
            "24/7 availability",
            isFleet ? "Fleet orchestration template" : "Devin-powered deployment",
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
