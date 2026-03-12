"use client";

import { motion } from "framer-motion";
import { Send } from "lucide-react";
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
      className="mx-auto flex h-full w-full max-w-none flex-col"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {NAME_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.name}
            type="button"
            onClick={() => setName(suggestion.name)}
            className={`wizard-option-card p-3.5 text-left ${
              name === suggestion.name ? "border-[#ffaa44]/40" : ""
            }`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.14),rgba(255,170,68,0.1)_30%,rgba(17,19,28,0.96)_100%)] text-[1.3rem] font-medium text-[#ffd8b5]">
              {suggestion.name.slice(0, 1)}
            </div>
            <p className="mt-3 text-[1.15rem] font-medium tracking-tight text-white sm:text-[1.4rem]">
              {suggestion.name}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/54 sm:text-sm">{suggestion.tone}</p>
          </button>
        ))}
      </div>

      <div className="wizard-input-shell mt-3 flex items-center gap-3 px-4 py-2.5">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Jarvis, Friday, Ada..."
          className="min-w-0 flex-1 bg-transparent text-lg text-white placeholder:text-white/28 focus:outline-none sm:text-xl"
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

      <div className="wizard-preview-card mt-3 overflow-hidden">
        <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-start">
          <div className="rounded-[1.05rem] border border-white/10 bg-black/16 px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
              Telegram handle
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              @your_operator
            </p>
          </div>
          <div className="rounded-[1.05rem] border border-white/10 bg-black/16 px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
              First handoff
            </p>
            <p className="mt-2 text-base leading-snug text-white/84 sm:text-[1.05rem]">
              &quot;Hi, I&apos;m <span className="text-[#ffbf8c]">{name || "your operator"}</span>.
              I&apos;ll stay with this conversation and keep the next step moving.&quot;
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
