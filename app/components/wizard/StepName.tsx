"use client";

import { motion } from "framer-motion";
import { ArrowRight, Send } from "lucide-react";
import { useState } from "react";

interface StepNameProps {
  onSubmit: (name: string) => void;
}

const NAME_SUGGESTIONS = [
  { name: "Ada", tone: "Analytic, concise" },
  { name: "Relay", tone: "Collaborative, patient" },
  { name: "Friday", tone: "Analytic, direct" },
  { name: "Atlas", tone: "Steady, composed" },
];

export function StepName({ onSubmit }: StepNameProps) {
  const [name, setName] = useState("");

  const submit = () => {
    if (!name.trim()) {
      return;
    }

    onSubmit(name.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full w-full max-w-2xl flex-col"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {NAME_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.name}
            type="button"
            onClick={() => setName(suggestion.name)}
            className={`wizard-option-card p-4 text-left ${
              name === suggestion.name ? "border-[#ffaa44]/40" : ""
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.14),rgba(255,170,68,0.1)_30%,rgba(17,19,28,0.96)_100%)] text-[1.6rem] font-medium text-[#ffd8b5]">
              {suggestion.name.slice(0, 1)}
            </div>
            <p className="mt-4 text-[1.75rem] font-medium tracking-tight text-white">
              {suggestion.name}
            </p>
            <p className="mt-1 text-sm text-white/54">{suggestion.tone}</p>
          </button>
        ))}
      </div>

      <div className="wizard-input-shell mt-4 flex items-center gap-3 px-4 py-3">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Jarvis, Friday, Ada..."
          className="min-w-0 flex-1 bg-transparent text-xl text-white placeholder:text-white/28 focus:outline-none"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              submit();
            }
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ffb075]/30 bg-[linear-gradient(135deg,rgba(255,170,68,0.18),rgba(255,107,53,0.16))] text-[#ffdcb8] transition hover:border-[#ffaa44]/46 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      <div className="wizard-preview-card mt-4 overflow-hidden">
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
              Telegram handle
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-white">
              @your_operator
            </p>

            <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-white/40">
              First handoff
            </p>
            <p className="mt-2 max-w-xl text-[1.45rem] leading-tight text-white/88">
              &quot;Hi, I&apos;m{" "}
              <span className="text-[#ffbf8c]">{name || "your operator"}</span>. I&apos;ll stay
              with this conversation and keep the next step moving.&quot;
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/56">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!name.trim()}
        className="brand-button mt-5 self-start px-8 py-3 text-sm font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-35"
      >
        Continue to Tone
      </button>
    </motion.div>
  );
}
