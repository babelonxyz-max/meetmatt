"use client";

import { motion } from "framer-motion";
import { Bot, CheckCircle2, KeyRound, Loader2, ShieldCheck } from "lucide-react";

interface TelegramBotSummary {
  id: string;
  username: string | null;
  firstName: string | null;
  telegramLink: string | null;
}

interface StepTelegramProps {
  token: string;
  bot: TelegramBotSummary | null;
  isValidating: boolean;
  errorMessage: string | null;
  onTokenChange: (value: string) => void;
  onContinue: () => void;
}

export function StepTelegram({
  token,
  bot,
  isValidating,
  errorMessage,
  onTokenChange,
  onContinue,
}: StepTelegramProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full w-full max-w-2xl flex-col"
    >
      <div className="wizard-input-shell flex items-center gap-3 px-4 py-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ffb075]/24 bg-[linear-gradient(135deg,rgba(255,170,68,0.14),rgba(255,107,53,0.1))] text-[#ffd8b5]">
          <KeyRound className="h-4.5 w-4.5" />
        </div>
        <input
          type="password"
          value={token}
          onChange={(event) => onTokenChange(event.target.value)}
          placeholder="1234567890:AAExampleBotFatherToken"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-white placeholder:text-white/28 focus:outline-none sm:text-base"
        />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {[
          "Create the bot with @BotFather first",
          "We validate the token with Telegram before payment",
          "Matt deploys against your existing bot",
        ].map((item) => (
          <div
            key={item}
            className="rounded-[0.95rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] leading-relaxed text-white/58"
          >
            {item}
          </div>
        ))}
      </div>

      {errorMessage ? (
        <div className="mt-3 rounded-[1.1rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      {bot ? (
        <div className="wizard-preview-card mt-2.5 p-3.5">
          <div className="flex items-center gap-2 text-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-sm font-medium">Telegram verified this bot</p>
          </div>

          <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-white/10 bg-black/16 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/36">Handle</p>
              <p className="mt-1 text-sm font-medium text-white">
                {bot.username ? `@${bot.username}` : "Private bot"}
              </p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-black/16 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/36">Bot ID</p>
              <p className="mt-1 text-sm font-medium text-white">{bot.id}</p>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-black/16 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/36">Display name</p>
              <p className="mt-1 text-sm font-medium text-white">
                {bot.firstName || "Not set"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="wizard-preview-card mt-2.5 p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/16 text-[#ffd3a7]">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                What happens next
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/76">
                Once Telegram verifies the token, checkout stays the same. Matt will use this bot
                as the live identity during deployment.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={!token.trim() || isValidating}
        className="brand-button mt-3.5 flex w-full max-w-sm items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-35"
      >
        {isValidating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying with Telegram
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Continue to Launch
          </>
        )}
      </button>
    </motion.div>
  );
}
