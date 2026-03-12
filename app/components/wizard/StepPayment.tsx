"use client";

import { motion } from "framer-motion";
import { Check, Clock3, Layers3, MessageCircleMore, Wallet } from "lucide-react";
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
  const priceLabel = isDayPass ? "$5" : "$150";
  const termLabel = isDayPass ? "for 24 hours" : "first month";
  const summaryRows = [
    { label: "Operator", value: agentName },
    { label: "Runtime", value: isFleet ? "Fleet rollout" : "Single operator" },
    {
      label: "Identity",
      value: botUsername ? `@${botUsername}` : "Your connected Telegram bot",
    },
    { label: "Charge", value: `${priceLabel} ${termLabel}` },
  ];
  const includedRows = [
    {
      icon: Clock3,
      label: isDayPass ? "24-hour live pass" : "Hosted live runtime",
      detail: isDayPass
        ? "A short paid launch window to test the operator live."
        : "Matt keeps the operator online after checkout confirmation.",
    },
    {
      icon: MessageCircleMore,
      label: botUsername ? `Uses @${botUsername}` : "Uses your Telegram bot",
      detail: "Matt deploys directly onto the bot you already connected.",
    },
    {
      icon: Layers3,
      label: isFleet ? "Fleet orchestration ready" : "Single-thread launch",
      detail: isFleet
        ? "Prepared for a broader operator system after first launch."
        : "Focused on one primary relationship flow first.",
    },
  ];

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

      <div className="space-y-4">
        <div className="space-y-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
              Launch shape
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/72">
              Pick the runtime Matt should provision first.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onDeploymentModeChange("assistant")}
              className={`wizard-choice-chip min-w-[13rem] flex-1 px-4 py-3 text-left ${
                !isFleet ? "wizard-choice-chip-active" : ""
              }`}
            >
              <p className="text-sm font-medium tracking-tight text-white">Single operator</p>
              <p className="mt-1 text-xs leading-relaxed text-white/58">
                One primary relationship flow.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onDeploymentModeChange("fleet")}
              className={`wizard-choice-chip min-w-[13rem] flex-1 px-4 py-3 text-left ${
                isFleet ? "wizard-choice-chip-active" : ""
              }`}
            >
              <p className="text-sm font-medium tracking-tight text-white">Fleet rollout</p>
              <p className="mt-1 text-xs leading-relaxed text-white/58">
                Wider orchestration after the first launch.
              </p>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                Billing option
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/72">
                Choose the shortest paid path that fits this launch.
              </p>
            </div>
            <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/52 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              Card or crypto
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onLaunchOfferChange("day_pass")}
              className={`wizard-choice-chip min-w-[13rem] flex-1 px-4 py-3 text-left ${
                isDayPass ? "wizard-choice-chip-active" : ""
              }`}
            >
              <p className="text-sm font-medium text-white">$5 day pass</p>
              <p className="mt-1 text-xs leading-relaxed text-white/58">
                Live for 24 hours. Good for a paid pilot.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onLaunchOfferChange("monthly")}
              className={`wizard-choice-chip min-w-[13rem] flex-1 px-4 py-3 text-left ${
                !isDayPass ? "wizard-choice-chip-active" : ""
              }`}
            >
              <p className="text-sm font-medium text-white">$150 monthly</p>
              <p className="mt-1 text-xs leading-relaxed text-white/58">
                Go straight into the full hosted runtime.
              </p>
            </button>
          </div>
        </div>

        <div className="wizard-inline-surface space-y-3 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                Launch summary
              </p>
              <div className="mt-1.5 flex items-end gap-2">
                <span className="text-[1.9rem] font-semibold tracking-tight text-white sm:text-[2.2rem]">
                  {priceLabel}
                </span>
                <span className="pb-1 text-sm text-white/54">{termLabel}</span>
              </div>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-white/58">
              Matt will provision the live runtime on your connected Telegram bot right after payment.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className="rounded-[1rem] bg-black/14 px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/32">{row.label}</p>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-white/86">
                  {row.value}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {includedRows.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-[1rem] bg-white/[0.035] px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffaa44]/10 text-[#ffd4aa] shadow-[inset_0_0_0_1px_rgba(255,170,68,0.1)]">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                    <p className="text-sm font-medium text-white/86">{label}</p>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/54">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <label className="mt-3 flex max-w-3xl cursor-pointer items-start gap-3 rounded-[1rem] bg-white/[0.035] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]">
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
