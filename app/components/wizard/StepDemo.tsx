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

  useEffect(() => {
    return () => {
      if (replyTimerRef.current !== null) {
        window.clearTimeout(replyTimerRef.current);
      }
    };
  }, []);

  const handleSend = () => {
    if (!input.trim() || remaining <= 0 || isBotTyping) return;

    const userMsg = input.trim();
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

  const visibleMessages = useMemo(
    () => messages.slice(-MAX_VISIBLE_MESSAGES),
    [messages]
  );
  const canContinue = remaining === 0 && !isBotTyping;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto h-full max-w-lg"
    >
      <div className="text-center mb-6">
        <h2 className="mb-2 text-3xl font-bold text-white">Meet {agentName}</h2>
        <p className="text-white/65">Try a quick chat - {remaining} messages left</p>
      </div>

      <div className="flex h-[23rem] flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="relative h-64 overflow-hidden p-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[rgba(18,17,40,0.95)] to-transparent" />
          <div className="flex h-full flex-col justify-end gap-2">
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      m.role === "user" ? "bg-blue-600" : "bg-purple-600"
                    }`}>
                      {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                      m.role === "user"
                        ? "rounded-br-none bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                        : "rounded-bl-none border border-white/10 bg-white/[0.06] text-white/90"
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
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="rounded-xl rounded-bl-none border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white/80">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/90" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/75 [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/60 [animation-delay:240ms]" />
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-white/10 p-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={remaining > 0 ? "Type a message..." : "Upgrade to continue"}
            disabled={remaining <= 0 || isBotTyping}
            className="flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-cyan-300 focus:outline-none disabled:opacity-50"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || remaining <= 0 || isBotTyping}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 p-2 transition-opacity hover:opacity-95 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {canContinue && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <p className="mb-4 text-white/65">Ready to deploy {agentName}?</p>
          <button
            onClick={onContinue}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-8 py-4 font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.45)] transition-opacity hover:opacity-95"
          >
            Continue to Deploy →
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
