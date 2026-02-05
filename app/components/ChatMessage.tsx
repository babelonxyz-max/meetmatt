"use client";

import { motion } from "framer-motion";

interface ChatMessageProps {
  content: string;
  role: "user" | "assistant";
  timestamp?: Date;
}

export function ChatMessage({ content, role, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-cyan-500 text-white rounded-br-md"
            : "bg-slate-800 text-slate-200 rounded-bl-md"
        }`}
      >
        <p className="text-sm">{content}</p>
        {timestamp && (
          <span className="text-xs opacity-60 mt-1 block">
            {timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function ChatTypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-start"
    >
      <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="w-2 h-2 bg-slate-400 rounded-full"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
