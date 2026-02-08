"use client";

import { motion } from "framer-motion";
import { Send, MessageCircle } from "lucide-react";
import { useState } from "react";

interface StepTelegramContactProps {
  onSubmit: (contact: string) => void;
}

export function StepTelegramContact({ onSubmit }: StepTelegramContactProps) {
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  const validateContact = (value: string) => {
    // Remove @ if present at start
    const cleanValue = value.replace(/^@/, "").trim();
    
    if (!cleanValue) {
      return "Please enter your Telegram username or phone number";
    }
    
    // Check if it looks like a username (alphanumeric + underscore)
    if (/^[a-zA-Z0-9_]{5,32}$/.test(cleanValue)) {
      return "";
    }
    
    // Check if it looks like a phone number
    if (/^\+?[0-9\s\-\(\)]{8,}$/.test(cleanValue)) {
      return "";
    }
    
    return "Please enter a valid Telegram username or phone number";
  };

  const handleSubmit = () => {
    const validationError = validateContact(contact);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // Clean the contact before submitting
    const cleanContact = contact.replace(/^@/, "").trim();
    onSubmit(cleanContact);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto text-center px-4 sm:px-0"
    >
      <div className="mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2 text-[var(--foreground)]">
          How can we reach you on Telegram?
        </h2>
        <p className="text-[var(--muted)]">
          We&apos;ll send you the bot link and activation code here
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={contact}
            onChange={(e) => {
              setContact(e.target.value);
              setError("");
            }}
            placeholder="@username or +1234567890"
            className={`w-full px-6 py-4 bg-[var(--card)] border rounded-xl text-xl text-center text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 transition-all ${
              error ? "border-red-500 focus:ring-red-500/20" : "border-[var(--border)] focus:border-blue-500 focus:ring-blue-500/20"
            }`}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm"
          >
            {error}
          </motion.p>
        )}

        <div className="text-sm text-[var(--muted)] space-y-2">
          <p>💡 You can provide:</p>
          <ul className="space-y-1">
            <li>• Your Telegram username (with or without @)</li>
            <li>• Your phone number with country code</li>
          </ul>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!contact.trim()}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
        >
          Continue
          <Send className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
