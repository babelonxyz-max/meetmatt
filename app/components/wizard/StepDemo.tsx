"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Bot, User } from "lucide-react";

interface StepDemoProps {
  agentName: string;
  personality: string;
  onContinue: () => void;
}

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
}

const sampleResponses: Record<string, string[]> = {
  professional: [
    "Good morning. I've reviewed your calendar and rescheduled the conflicting meeting to 2 PM.",
    "I've prepared the weekly report summary. Key metrics are in your inbox.",
    "Reminder: Your flight to New York departs in 4 hours. Traffic suggests leaving by 1 PM.",
  ],
  friendly: [
    "Good morning! ☀️ I've got your day sorted - moved that meeting that was clashing.",
    "Hey! Just sent you a summary of your week. You're doing great! 🎉",
    "Quick heads up - your flight's in a few hours. Want me to order you a cab? 🚗",
  ],
  hustler: [
    "Morning. Calendar fixed, conflict resolved. Next?",
    "Report done. Key numbers: Revenue +15%, 3 tasks pending your approval.",
    "Flight in 4h. Leave by 1 PM or you'll miss it.",
  ],
};

const MAX_VISIBLE_MESSAGES = 6;
const DEMO_PROMPTS = [
  "Reschedule my 4 PM meeting.",
  "Summarize today's priorities.",
  "Remind me about my flight tonight.",
];

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function StepDemo({ agentName, personality, onContinue }: StepDemoProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: createMessageId(), role: "bot", text: `Hi! I'm ${agentName}. Try chatting with me - 3 messages free!` },
  ]);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState(3);
  const [sentCount, setSentCount] = useState(0);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const replyTimerRef = useRef<number | null>(null);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: messages.length > 1 ? "smooth" : "auto",
    });
  }, [messages, isBotTyping]);

  const sendMessage = (messageText: string) => {
    if (!messageText.trim() || remaining <= 0 || isBotTyping) return;

    const userMsg = messageText.trim();
    setMessages((m) => [...m, { id: createMessageId(), role: "user", text: userMsg }]);
    setInput("");
    setRemaining((r) => Math.max(0, r - 1));

    const responses = sampleResponses[personality] || sampleResponses.professional;
    const response = responses[sentCount] || "I'm ready to help you with more when you upgrade!";
    setSentCount((count) => count + 1);
    setIsBotTyping(true);

    replyTimerRef.current = window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: createMessageId(), role: "bot", text: response }]);
      setIsBotTyping(false);
      replyTimerRef.current = null;
    }, 700);
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const visibleMessages = useMemo(
    () => messages.slice(-MAX_VISIBLE_MESSAGES),
    [messages]
  );
  const canContinue = remaining === 0 && !isBotTyping;
  const toneLabel = personality ? personality.charAt(0).toUpperCase() + personality.slice(1) : "Professional";
  const helperText = canContinue
    ? `${agentName} is ready. Launch this operator when you are.`
    : isBotTyping
      ? "Matt is drafting the last response..."
      : `Use all 3 demo messages to unlock launch. ${remaining} left.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col justify-start"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
        <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-white/70">
          Tone: {toneLabel}
        </span>
        <span className="rounded-full border border-[#ffaa44]/20 bg-[#ffaa44]/10 px-3 py-1.5 text-[#ffe3c5]">
          {remaining} messages left
        </span>
      </div>

      <div className="brand-panel-strong brand-noise flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] p-2.5">
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">Channel</p>
              <p className="mt-0.5 text-sm font-medium text-white">Matt simulating a live Telegram thread</p>
            </div>
            <div className="rounded-full border border-[#ffb075]/20 bg-[#ffaa44]/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#ffe2c1]">
              {remaining} free messages
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={remaining <= 0 || isBotTyping}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-[11px] text-white/68 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-2.5 min-h-0 flex-1 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,112,64,0.12),transparent_30%),linear-gradient(180deg,rgba(10,12,22,0.98),rgba(14,16,28,0.94))] p-3.5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[rgba(16,10,10,0.9)] to-transparent" />
          <div ref={messageViewportRef} className="flex h-full flex-col justify-end gap-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {visibleMessages.map((m, i) => {
                const age = (i + 1) / visibleMessages.length;
                const bubbleOpacity = 0.3 + age * 0.7;

                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: bubbleOpacity, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      m.role === "user"
                        ? "border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06))] text-white"
                        : "border border-[#ffb075]/25 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.18),rgba(255,170,68,0.1)_28%,rgba(255,107,53,0.78)_100%)] text-white"
                    }`}>
                      {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] rounded-[1.15rem] p-3 text-sm ${
                      m.role === "user"
                        ? "rounded-br-none border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04))] text-white"
                        : "rounded-bl-none border border-[#ffb075]/30 bg-[linear-gradient(135deg,rgba(255,107,53,0.94),rgba(255,170,68,0.92))] text-white shadow-[0_16px_40px_rgba(255,107,53,0.16)]"
                    }`}>
                      {m.text}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isBotTyping && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ffb075]/25 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.18),rgba(255,170,68,0.1)_28%,rgba(255,107,53,0.78)_100%)]">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-[1.15rem] rounded-bl-none border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/80">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffaa44]/90" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9a60]/75 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff6835]/60 [animation-delay:240ms]" />
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="mt-2.5 rounded-[1.2rem] border border-white/10 bg-black/16 p-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={remaining > 0 ? "Ask about meetings, tasks, or reminders..." : "Demo complete"}
              disabled={remaining <= 0 || isBotTyping}
              className="brand-button-secondary flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-[#ffaa44] focus:outline-none disabled:opacity-50"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || remaining <= 0 || isBotTyping}
              className="brand-button rounded-xl px-3 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-white/55">{helperText}</p>
            <button
              type="button"
              onClick={onContinue}
              disabled={!canContinue}
              className="brand-button px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {canContinue ? "Continue" : "Finish Demo"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
