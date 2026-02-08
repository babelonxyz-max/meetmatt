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
      className="max-w-lg mx-auto px-4 sm:px-0"
    >
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2 text-[var(--foreground)]">Meet {agentName}</h2>
        <p className="text-[var(--muted)]">Try a quick chat - {remaining} messages left</p>
      </div>

      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        {/* Chat Messages */}
        <div className="h-64 p-4 overflow-y-auto space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                m.role === "user" ? "bg-[var(--accent)]" : "bg-[#6366f1]"
              }`}>
                {m.role === "user" ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                m.role === "user" 
                  ? "bg-[var(--accent)] text-white rounded-br-none" 
                  : "bg-[var(--background)] text-[var(--foreground)] rounded-bl-none"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-[var(--border)] flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={remaining > 0 ? "Type a message..." : "Upgrade to continue"}
            disabled={remaining <= 0}
            className="flex-1 px-4 py-2 bg-[var(--background)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || remaining <= 0}
            className="p-2 bg-[var(--accent)] hover:opacity-90 disabled:bg-[var(--card)] text-white rounded-lg transition-all shadow-md shadow-[var(--accent)]/20 disabled:shadow-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {remaining === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <p className="text-[var(--muted)] mb-4">Ready to deploy {agentName}?</p>
          <button
            onClick={onContinue}
            className="px-8 py-4 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] hover:opacity-90 text-white rounded-xl font-semibold transition-all shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/30"
          >
            Continue to Deploy →
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
