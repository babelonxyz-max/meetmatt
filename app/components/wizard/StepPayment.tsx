"use client";

import { motion } from "framer-motion";
import { Check, Wallet } from "lucide-react";
import { useState } from "react";

interface StepPaymentProps {
  agentName: string;
  deploymentMode: "assistant" | "fleet";
  botUsername?: string | null;
  errorMessage?: string | null;
  onDeploymentModeChange: (mode: "assistant" | "fleet") => void;
  onContinue: () => void;
}

export function StepPayment({
  agentName,
  deploymentMode,
  botUsername,
  errorMessage,
  onDeploymentModeChange,
  onContinue,
}: StepPaymentProps) {
  const [accepted, setAccepted] = useState(false);
  const isFleet = deploymentMode === "fleet";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full w-full max-w-3xl flex-col"
    >
      {errorMessage ? (
        <div className="mb-4 rounded-[1.25rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onDeploymentModeChange("assistant")}
            className={`wizard-option-card w-full p-5 text-left ${
              !isFleet ? "border-[#ffaa44]/40" : ""
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Single</p>
            <p className="mt-2.5 text-[1.35rem] font-medium tracking-tight text-white sm:text-[1.5rem]">
              One operator thread
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/62 sm:text-sm">
              Best when Matt is deploying a single assistant into one primary relationship flow.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onDeploymentModeChange("fleet")}
            className={`wizard-option-card w-full p-5 text-left ${
              isFleet ? "border-[#ffaa44]/40" : ""
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Fleet</p>
            <p className="mt-2.5 text-[1.35rem] font-medium tracking-tight text-white sm:text-[1.5rem]">
              Multi-agent rollout
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/62 sm:text-sm">
              Prepares orchestration and a broader runtime shape after the first launch.
            </p>
          </button>
        </div>

        <div className="wizard-preview-card p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                Starter launch
              </p>
              <div className="mt-2.5 flex items-end gap-2">
                <span className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">$150</span>
                <span className="pb-1 text-sm text-white/58">first month</span>
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/62">
              Card or crypto
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-white/10 bg-black/16 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Operator</p>
              <p className="mt-1 text-sm text-white/84">{agentName}</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-black/16 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Mode</p>
              <p className="mt-1 text-sm text-white/84">{isFleet ? "Fleet" : "Single"}</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-black/16 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Bot</p>
              <p className="mt-1 text-sm text-white/84">
                {botUsername ? `@${botUsername}` : "Customer-owned"}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {[
              "Unlimited messages",
              botUsername ? `Uses @${botUsername}` : "Uses your connected Telegram bot",
              isFleet ? "Fleet orchestration template" : "Managed operator runtime",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/78"
              >
                <Check className="h-4 w-4 text-emerald-300" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      <label className="mt-3 flex max-w-3xl cursor-pointer items-start gap-3 rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3.5">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent"
        />
        <span className="text-sm leading-relaxed text-white/68">
          I understand this starts the first live Telegram operator runtime and setup usually takes
          2 to 5 minutes after payment confirmation.
        </span>
      </label>

      <button
        type="button"
        onClick={onContinue}
        disabled={!accepted}
        className="brand-button mt-4 flex w-full max-w-sm items-center justify-center gap-2 py-3 text-sm font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Wallet className="h-5 w-5" />
        Proceed to Payment
      </button>
    </motion.div>
  );
}
