"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Send, Bot, User } from "lucide-react";

interface StepDemoProps {
  agentName: string;
  personality: string;
  onContinue: () => void;
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

export function StepDemo({ agentName, personality, onContinue }: StepDemoProps) {
  const [messages, setMessages] = useState([
    { role: "bot", text: `Hi! I'm ${agentName}. Try chatting with me - 3 messages free!` },
  ]);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState(3);

  const handleSend = () => {
    if (!input.trim() || remaining <= 0) return;

    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setInput("");
    setRemaining((r) => r - 1);

    // Generate response based on personality
    const responses = sampleResponses[personality] || sampleResponses.professional;
    const response = responses[3 - remaining] || "I'm ready to help you with more when you upgrade!";

    setTimeout(() => {
      setMessages((m) => [...m, { role: "bot", text: response }]);
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex h-full max-w-lg flex-col gap-3"
    >
      <div className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 backdrop-blur-md">
        <p className="text-sm font-medium text-white">Live demo with {agentName}</p>
        <p className="mt-1 text-xs text-white/60">{remaining} test messages left before deploy step.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[0.05] shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
        {/* Chat Messages */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                m.role === "user" ? "bg-blue-600" : "bg-purple-600"
              }`}>
                {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                m.role === "user" 
                  ? "rounded-br-none bg-gradient-to-r from-cyan-500 to-blue-600 text-white" 
                  : "rounded-bl-none border border-white/10 bg-white/[0.06] text-white/90"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 border-t border-white/10 p-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={remaining > 0 ? "Type a message..." : "Upgrade to continue"}
            disabled={remaining <= 0}
            className="flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-cyan-300 focus:outline-none disabled:opacity-50"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || remaining <= 0}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 p-2 transition-opacity hover:opacity-95 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {remaining === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="mb-2 text-xs text-white/65">Ready to deploy {agentName}?</p>
          <button
            onClick={onContinue}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.45)] transition-opacity hover:opacity-95"
          >
            Continue to Deploy
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
