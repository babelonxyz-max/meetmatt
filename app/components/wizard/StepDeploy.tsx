"use client";

import { motion } from "framer-motion";
import { Loader2, Check, Bot, MessageSquare, Shield, AlertCircle } from "lucide-react";

interface StepDeployProps {
  agentName: string;
  status: "deploying" | "completed" | "failed";
  progress: number;
  telegramLink?: string;
  authCode?: string;
}

const steps = [
  { icon: Bot, label: "Creating Telegram bot..." },
  { icon: MessageSquare, label: "Configuring responses..." },
  { icon: Shield, label: "Generating auth code..." },
];

export function StepDeploy({ agentName, status, progress, telegramLink, authCode }: StepDeployProps) {
  const currentStep = Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1);

  if (status === "completed" && telegramLink) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-md text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="mb-1 text-2xl font-bold text-white">{agentName} is ready!</h2>
        <p className="mb-4 text-sm text-white/65">Your AI assistant has been deployed</p>

        <div className="mb-4 rounded-xl border border-white/12 bg-white/[0.05] p-4 backdrop-blur-md">
          <p className="mb-1 text-xs text-white/65">Bot Username</p>
          <p className="font-mono text-lg text-white">@{telegramLink.split("/").pop()}</p>
        </div>

        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 block w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.45)] transition-opacity hover:opacity-95"
        >
          Open in Telegram
        </a>

        {authCode && (
          <div className="rounded-xl border border-white/12 bg-white/[0.05] p-3 backdrop-blur-md">
            <p className="mb-1 text-xs text-white/65">Your auth code</p>
            <p className="text-xl font-mono font-bold text-white">{authCode}</p>
            <p className="mt-1 text-[11px] text-white/50">Send this to the bot to activate</p>
          </div>
        )}
      </motion.div>
    );
  }

  if (status === "failed") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-md text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="mb-1 text-2xl font-bold text-white">Deployment failed</h2>
        <p className="mb-4 text-sm text-white/65">
          Something went wrong during setup. You can retry from the dashboard or contact support.
        </p>
        <a
          href="/dashboard"
          className="inline-block rounded-xl border border-white/12 bg-white/[0.05] px-6 py-3 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/10"
        >
          Go to Dashboard
        </a>
      </motion.div>
    );
  }

  return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-auto max-w-md text-center"
      >
      <div className="relative mx-auto mb-4 h-20 w-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-gray-800"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="text-blue-500"
            strokeDasharray={`${progress}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      </div>

      <h2 className="mb-1 text-xl font-bold text-white">Deploying {agentName}...</h2>
      <p className="mb-4 text-sm text-white/65">Usually takes around 2 minutes</p>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors ${
                isActive ? "border border-cyan-300/30 bg-cyan-400/15" : isComplete ? "border border-emerald-300/25 bg-emerald-500/10" : "border border-white/10 bg-white/[0.05]"
              }`}
            >
              <div className={`rounded-lg p-1.5 ${
                isActive ? "bg-cyan-500" : isComplete ? "bg-emerald-500" : "bg-white/20"
              }`}>
                {isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={`text-sm ${isActive ? "text-white" : isComplete ? "text-white/85" : "text-white/50"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
