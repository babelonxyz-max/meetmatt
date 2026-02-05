"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "./Input";
import { Button } from "./Button";
import { validateEmail } from "@/lib/validation";

interface NewsletterSignupProps {
  className?: string;
  variant?: "inline" | "stacked" | "card";
  title?: string;
  description?: string;
  buttonText?: string;
  successMessage?: string;
}

export function NewsletterSignup({
  className = "",
  variant = "inline",
  title = "Stay Updated",
  description = "Get the latest AI agent tips and exclusive offers.",
  buttonText = "Subscribe",
  successMessage = "Thanks for subscribing! Check your email for confirmation.",
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setStatus("loading");
    setError("");

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setStatus("success");
    setEmail("");
  };

  if (variant === "card") {
    return (
      <div className={`bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-6 border border-cyan-500/20 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-4">{description}</p>
        <FormContent />
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
      <p className="text-slate-400 text-sm mb-4">{description}</p>
      <FormContent />
    </div>
  );

  function FormContent() {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className={variant === "inline" ? "flex gap-2" : "space-y-2"}>
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            className={variant === "inline" ? "flex-1" : ""}
            disabled={status === "loading" || status === "success"}
          />
          <Button
            type="submit"
            isLoading={status === "loading"}
            disabled={status === "success"}
            className={variant === "inline" ? "whitespace-nowrap" : "w-full"}
          >
            {status === "success" ? "Subscribed!" : buttonText}
          </Button>
        </div>
        
        <AnimatePresence>
          {status === "success" && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-emerald-400"
            >
              {successMessage}
            </motion.p>
          )}
        </AnimatePresence>
      </form>
    );
  }
}
