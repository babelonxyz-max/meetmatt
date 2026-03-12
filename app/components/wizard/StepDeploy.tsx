"use client";

import { motion } from "framer-motion";
import { Loader2, Check, Bot, MessageSquare, Shield, AlertCircle } from "lucide-react";
import { NexusOrb } from "../NexusOrb";

interface StepDeployProps {
  agentName: string;
  status: "deploying" | "completed" | "failed";
  progress: number;
  telegramLink?: string;
  botUsername?: string;
}

const steps = [
  { icon: Bot, label: "Connecting Telegram bot..." },
  { icon: MessageSquare, label: "Configuring responses..." },
  { icon: Shield, label: "Preparing activation..." },
];

export function StepDeploy({ agentName, status, progress, telegramLink, botUsername }: StepDeployProps) {
  const currentStep = Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1);
  const deployOrbState = progress >= 70 ? "speaking" : progress >= 35 ? "thinking" : "listening";
  const resolvedBotUsername = botUsername || telegramLink?.split("/").pop();

  if (status === "completed" && telegramLink) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex h-full w-full max-w-md flex-col justify-start text-center"
      >
        <div className="brand-panel-strong brand-noise rounded-[1.55rem] p-4">
          <NexusOrb className="mx-auto mb-3" orbClassName="h-20 w-20" state="speaking" variant="plasma" />
          <p className="brand-kicker">Launch Confirmed</p>
          <h2 className="mt-1.5 text-[1.4rem] font-semibold text-white">{agentName} is ready!</h2>
          <p className="mt-1 text-sm text-white/65">Your AI assistant has been deployed and linked to your Telegram bot.</p>

          <div className="brand-panel mt-4 rounded-[1.25rem] p-3">
            <p className="mb-1 text-xs uppercase tracking-[0.14em] text-white/55">Bot username</p>
            <p className="font-mono text-base text-white sm:text-lg">
              {resolvedBotUsername ? `@${resolvedBotUsername.replace(/^@+/, "")}` : "Connected"}
            </p>
          </div>

          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            className="brand-button mt-3.5 block w-full py-2.5 text-center text-xs font-semibold uppercase tracking-[0.14em]"
          >
            Open in Telegram
          </a>
        </div>
      </motion.div>
    );
  }

  if (status === "failed") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex h-full w-full max-w-md flex-col justify-start text-center"
      >
        <div className="brand-panel-strong brand-noise rounded-[1.55rem] p-4">
          <div className="relative mx-auto mb-3 flex h-[4rem] w-[4rem] items-center justify-center rounded-full border border-red-400/20 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.14),rgba(248,113,113,0.2)_30%,rgba(14,10,14,0.98)_100%)]">
            <div className="absolute inset-[-20%] rounded-full bg-red-400/18 blur-xl" />
            <AlertCircle className="relative z-10 h-7 w-7 text-red-300" />
          </div>
          <h2 className="text-[1.35rem] font-semibold text-white">Deployment failed</h2>
          <p className="mt-1.5 text-sm text-white/65">
            Something went wrong during setup. You can retry from the dashboard or contact support.
          </p>
          <a
            href="/dashboard"
            className="brand-button-secondary mt-4 inline-block px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/10"
          >
            Go to Dashboard
          </a>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto flex h-full w-full max-w-md flex-col justify-start text-center"
    >
      <div className="brand-panel-strong brand-noise rounded-[1.55rem] p-3.5">
        <div className="relative mx-auto mb-3 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,170,68,0.18),transparent_68%)] blur-2xl" />
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-white/8"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            <path
              className="text-[#ff8a53]"
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <NexusOrb className="relative z-10" orbClassName="h-14 w-14" state={deployOrbState} variant="plasma" />
          <div className="pointer-events-none absolute bottom-0 rounded-full border border-white/10 bg-[#0f1422]/88 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/65">
            {progress}% synced
          </div>
        </div>

        <p className="brand-kicker">Provisioning</p>
        <h2 className="mt-1.5 text-[1.2rem] font-semibold text-white">Deploying {agentName}...</h2>
        <p className="mt-1 text-[13px] text-white/65">Usually takes around 2 minutes.</p>

        <div className="mt-2.5 flex items-center justify-center gap-2 text-[13px] text-white/70">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ffaa44]" />
          Matt is connecting the runtime to your Telegram bot.
        </div>

        <div className="mt-3 space-y-1.5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <div
                key={step.label}
                className={`flex items-center gap-2.5 rounded-[1rem] px-3 py-2.5 transition-colors ${
                  isActive
                    ? "border border-[#ffaa44]/30 bg-[#ffaa44]/12"
                    : isComplete
                      ? "border border-emerald-300/25 bg-emerald-500/10"
                      : "border border-white/10 bg-white/[0.05]"
                }`}
              >
                <div className={`rounded-full p-1.5 ${
                  isActive ? "bg-[#ff8a53]" : isComplete ? "bg-emerald-500" : "bg-white/14"
                }`}>
                  {isComplete ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </div>
                <span className={`text-[13px] ${isActive ? "text-white" : isComplete ? "text-white/85" : "text-white/50"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
