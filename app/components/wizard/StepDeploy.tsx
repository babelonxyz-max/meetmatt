"use client";

import { motion } from "framer-motion";
import { Loader2, Check, Bot, MessageSquare, Shield } from "lucide-react";

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
        className="max-w-md mx-auto text-center"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-3xl font-bold mb-2">{agentName} is ready!</h2>
        <p className="text-gray-400 mb-6">Your AI assistant has been deployed</p>

        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-400 mb-2">Bot Username</p>
          <p className="text-xl font-mono">@{telegramLink.split("/").pop()}</p>
        </div>

        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors mb-4"
        >
          Open in Telegram
        </a>

        {authCode && (
          <div className="p-4 bg-gray-900 rounded-xl">
            <p className="text-sm text-gray-400 mb-1">Your auth code</p>
            <p className="text-2xl font-mono font-bold">{authCode}</p>
            <p className="text-xs text-gray-500 mt-1">Send this to the bot to activate</p>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-md mx-auto text-center"
    >
      <div className="relative w-24 h-24 mx-auto mb-6">
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
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2">Deploying {agentName}...</h2>
      <p className="text-gray-400 mb-8">This usually takes about 2 minutes</p>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isActive ? "bg-blue-600/20" : isComplete ? "bg-green-500/10" : "bg-gray-900"
              }`}
            >
              <div className={`p-2 rounded-lg ${
                isActive ? "bg-blue-600" : isComplete ? "bg-green-500" : "bg-gray-800"
              }`}>
                {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`${isActive ? "text-white" : isComplete ? "text-gray-300" : "text-gray-500"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
