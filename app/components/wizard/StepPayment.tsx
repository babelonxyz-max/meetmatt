"use client";

import { motion } from "framer-motion";
import { Check, Wallet } from "lucide-react";
import { useState } from "react";

interface StepPaymentProps {
  agentName: string;
  deploymentMode: "assistant" | "fleet";
  launchOffer: "monthly" | "day_pass";
  botUsername?: string | null;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onDeploymentModeChange: (mode: "assistant" | "fleet") => void;
  onLaunchOfferChange: (offer: "monthly" | "day_pass") => void;
  onContinue: () => void;
}

export function StepPayment({
  agentName,
  deploymentMode,
  launchOffer,
  botUsername,
  errorMessage,
  isSubmitting = false,
  onDeploymentModeChange,
  onLaunchOfferChange,
  onContinue,
}: StepPaymentProps) {
  const [accepted, setAccepted] = useState(false);
  const isFleet = deploymentMode === "fleet";
  const isDayPass = launchOffer === "day_pass";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full w-full max-w-3xl flex-col"
    >
      {errorMessage ? (
        <div className="mb-3 rounded-[1.1rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDeploymentModeChange("assistant")}
            className={`wizard-choice-chip min-w-[14rem] flex-1 px-4 py-3 text-left ${
              !isFleet ? "wizard-choice-chip-active" : ""
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Single</p>
            <p className="mt-1.5 text-[1rem] font-medium tracking-tight text-white sm:text-[1.08rem]">
              One operator thread
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/62">
              Best when Matt is deploying a single assistant into one primary relationship flow.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onDeploymentModeChange("fleet")}
            className={`wizard-choice-chip min-w-[14rem] flex-1 px-4 py-3 text-left ${
              isFleet ? "wizard-choice-chip-active" : ""
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Fleet</p>
            <p className="mt-1.5 text-[1rem] font-medium tracking-tight text-white sm:text-[1.08rem]">
              Multi-agent rollout
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/62">
              Prepares orchestration and a broader runtime shape after the first launch.
            </p>
          </button>
        </div>

        <div className="wizard-inline-surface p-3.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                {isDayPass ? "24-hour pass" : "Starter launch"}
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-[2rem] font-semibold tracking-tight text-white sm:text-[2.4rem]">
                  {isDayPass ? "$5" : "$150"}
                </span>
                <span className="pb-1 text-xs text-white/58 sm:text-sm">
                  {isDayPass ? "for 24 hours" : "first month"}
                </span>
              </div>
            </div>
            <div className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/62 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              Card or crypto
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onLaunchOfferChange("day_pass")}
              className={`wizard-choice-chip min-w-[14rem] flex-1 px-3 py-2.5 text-left ${
                isDayPass ? "wizard-choice-chip-active" : ""
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Day Pass</p>
              <p className="mt-1 text-sm font-medium text-white/86">$5 for 24 hours</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/56">
                A short paid launch window to test the live operator with real traffic.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onLaunchOfferChange("monthly")}
              className={`wizard-choice-chip min-w-[14rem] flex-1 px-3 py-2.5 text-left ${
                !isDayPass ? "wizard-choice-chip-active" : ""
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Monthly</p>
              <p className="mt-1 text-sm font-medium text-white/86">$150 first month</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/56">
                Go straight to hosted checkout by card or crypto.
              </p>
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-[1rem] bg-black/16 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Operator</p>
              <p className="mt-1 text-sm text-white/84">{agentName}</p>
            </div>
            <div className="rounded-[1rem] bg-black/16 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Mode</p>
              <p className="mt-1 text-sm text-white/84">{isFleet ? "Fleet" : "Single"}</p>
            </div>
            <div className="rounded-[1rem] bg-black/16 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/34">Bot</p>
              <p className="mt-1 text-sm text-white/84">
                {botUsername ? `@${botUsername}` : "Customer-owned"}
              </p>
            </div>
          </div>

          <div className="mt-2.5 grid gap-1.5">
            {[
              isDayPass ? "24-hour live operator access" : "Unlimited messages",
              botUsername ? `Uses @${botUsername}` : "Uses your connected Telegram bot",
              isFleet ? "Fleet orchestration template" : "Managed operator runtime",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 rounded-[1rem] bg-white/[0.04] px-3 py-2 text-sm text-white/78 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
              >
                <Check className="h-4 w-4 text-emerald-300" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      <label className="mt-2.5 flex max-w-3xl cursor-pointer items-start gap-3 rounded-[1rem] bg-white/[0.04] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent"
        />
        <span className="text-[13px] leading-relaxed text-white/68">
          {isDayPass
            ? "I understand this starts a paid 24-hour operator pass and setup usually takes 2 to 5 minutes after payment confirmation."
            : "I understand this starts the first live Telegram operator runtime and setup usually takes 2 to 5 minutes after payment confirmation."}
        </span>
      </label>

      <button
        type="button"
        onClick={onContinue}
        disabled={!accepted || isSubmitting}
        className="brand-button mt-3.5 flex w-full max-w-sm items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Wallet className="h-5 w-5" />
        {isSubmitting
          ? "Preparing Checkout..."
          : (isDayPass ? "Checkout 24-Hour Pass" : "Proceed to Payment")}
      </button>
    </motion.div>
  );
}
