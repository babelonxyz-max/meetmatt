"use client";

import { motion } from "framer-motion";
import { Loader2, Check, Bot, MessageSquare, Shield, ExternalLink, Copy } from "lucide-react";
import { useState } from "react";

interface StepDeployProps {
  agentName: string;
  status: "deploying" | "completed" | "failed";
  progress: number;
  telegramLink?: string;
  authCode?: string;
}

const steps = [
  { icon: Bot, label: "Creating AI agent..." },
  { icon: MessageSquare, label: "Setting up Telegram bot..." },
  { icon: Shield, label: "Configuring capabilities..." },
  { icon: Check, label: "Finalizing deployment..." },
];

export function StepDeploy({ agentName, status, progress, telegramLink, authCode }: StepDeployProps) {
  const [copied, setCopied] = useState(false);
  const currentStep = Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1);

  const copyAuthCode = () => {
    if (authCode) {
      navigator.clipboard.writeText(authCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === "completed" && telegramLink) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto text-center px-4 sm:px-0"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
          <Check className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold mb-2 text-[var(--foreground)]">
          {agentName} is live! 🎉
        </h2>
        <p className="text-[var(--muted)] mb-6">
          Your AI assistant has been successfully deployed
        </p>

        <div className="bg-[var(--card)] rounded-2xl p-6 mb-6 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)] mb-2">Start chatting now</p>
          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-semibold transition-colors"
          >
            Open in Telegram
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {authCode && (
          <div className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)]">
            <p className="text-sm text-[var(--muted)] mb-2">Your activation code</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-3 bg-[var(--background)] rounded-lg text-2xl font-mono font-bold text-[var(--foreground)] tracking-wider">
                {authCode}
              </code>
              <button
                onClick={copyAuthCode}
                className="p-3 bg-[var(--background)] hover:bg-[var(--card-hover)] rounded-lg transition-colors"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-[var(--muted)]" />}
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] mt-3">
              Send this code to your bot to activate it
            </p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
        >
          <p className="text-sm text-blue-500">
            ✨ You can manage your agent anytime from the Dashboard
          </p>
        </motion.div>
      </motion.div>
    );
  }

  if (status === "failed") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto text-center px-4 sm:px-0"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="text-4xl">😕</span>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)]">Deployment failed</h2>
        <p className="text-[var(--muted)] mb-4">Something went wrong. Please try again or contact support.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-semibold transition-colors"
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto text-center px-4 sm:px-0"
    >
      <div className="relative w-28 h-28 mx-auto mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-[var(--border)]"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            className="text-blue-500"
            strokeDasharray={`${progress}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)]">
        Deploying {agentName}...
      </h2>
      <p className="text-[var(--muted)] mb-8">This usually takes 2-3 minutes</p>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                isActive ? "bg-blue-500/10 border border-blue-500/20" : isComplete ? "bg-green-500/5" : "bg-[var(--card)]"
              }`}
            >
              <div className={`p-2 rounded-lg ${
                isActive ? "bg-blue-500" : isComplete ? "bg-green-500" : "bg-[var(--border)]"
              }`}>
                {isComplete ? <Check className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4 text-white" />}
              </div>
              <span className={`text-sm ${
                isActive ? "text-blue-500 font-medium" : isComplete ? "text-green-500" : "text-[var(--muted)]"
              }`}>
                {step.label}
              </span>
              {isActive && (
                <motion.div
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
