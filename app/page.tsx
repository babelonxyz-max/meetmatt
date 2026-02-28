"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { StepName } from "./components/wizard/StepName";
import { StepPersonality } from "./components/wizard/StepPersonality";
import { StepDemo } from "./components/wizard/StepDemo";
import { StepPayment } from "./components/wizard/StepPayment";
import { StepDeploy } from "./components/wizard/StepDeploy";
import { PaymentModal } from "./components/PaymentModal";
import { NexusOrb } from "./components/NexusOrb";

type Step = "name" | "personality" | "demo" | "payment" | "deploy";
type DeployStatus = "deploying" | "completed" | "failed";

const FLOW_STEPS: Array<{ id: Step; label: string; hint: string }> = [
  { id: "name", label: "Name", hint: "Give your assistant an identity" },
  { id: "personality", label: "Style", hint: "Choose interaction style" },
  { id: "demo", label: "Demo", hint: "Try a short conversation" },
  { id: "payment", label: "Payment", hint: "Confirm deployment plan" },
  { id: "deploy", label: "Launch", hint: "Provisioning in progress" },
];

const STEP_PROMPTS: Record<Step, string> = {
  name: "Hi, I'm Matt. Let's name your assistant first.",
  personality: "Great start. What personality should your assistant have?",
  demo: "Try a few messages and see how it responds.",
  payment: "Looks good. Confirm payment and I'll deploy it.",
  deploy: "Deployment is running. I'll keep you updated until it is live.",
};

function formatPersonality(personality: string): string {
  if (!personality) return "";
  return personality.charAt(0).toUpperCase() + personality.slice(1);
}

export default function Home() {
  const { login, authenticated, user } = usePrivy();
  const [step, setStep] = useState<Step>("name");
  const [agentName, setAgentName] = useState("");
  const [personality, setPersonality] = useState("");
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("deploying");
  const [deployProgress, setDeployProgress] = useState(0);
  const [telegramLink, setTelegramLink] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [config, setConfig] = useState({
    agentName: "",
    useCase: "assistant",
    scope: "",
    contactMethod: "telegram",
  });

  const handleNameSubmit = (name: string) => {
    setAgentName(name);
    setConfig((prev) => ({ ...prev, agentName: name }));
    setStep("personality");
  };

  const handlePersonalitySelect = (value: string) => {
    setPersonality(value);
    setConfig((prev) => ({ ...prev, scope: value }));
    setStep("demo");
  };

  const handleDemoComplete = () => {
    if (!authenticated) {
      login();
      return;
    }
    setStep("payment");
  };

  const handlePaymentContinue = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setStep("deploy");

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName,
          personality,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create agent");
      }

      const data = await response.json();
      pollAgentStatus(data.id);
    } catch (error) {
      console.error("Deployment error:", error);
      setDeployStatus("failed");
    }
  };

  const pollAgentStatus = useCallback(async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/agents/status?agentId=${id}`);
        if (!response.ok) return;

        const agent = await response.json();

        if (agent.status === "pending") {
          setDeployProgress(10);
        } else if (agent.status === "deploying") {
          setDeployProgress(50);
        } else if (agent.status === "active") {
          setDeployProgress(100);
          setDeployStatus("completed");
          setTelegramLink(agent.telegramLink || `https://t.me/${agent.name.toLowerCase()}_bot`);
          setAuthCode(agent.authCode || "");
          clearInterval(interval);
        } else if (agent.status === "error") {
          setDeployStatus("failed");
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 3000);

    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  }, []);

  const currentStepIndex = FLOW_STEPS.findIndex((entry) => entry.id === step);
  const safeStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  const progressPercent = (safeStepIndex / (FLOW_STEPS.length - 1)) * 100;
  const activeStep = FLOW_STEPS[safeStepIndex];
  const mattPrompt = STEP_PROMPTS[step];

  const userNarrative =
    step === "name"
      ? null
      : step === "personality"
        ? agentName
          ? `Call it ${agentName}.`
          : null
        : step === "demo"
          ? personality
            ? `Use a ${formatPersonality(personality)} tone.`
            : null
          : step === "payment"
            ? `Looks right. Let's deploy ${agentName || "it"}.`
            : "Launch now.";

  return (
    <div className="relative overflow-hidden bg-[#03050b] pb-20 pt-24 sm:pt-28">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_40%),radial-gradient(circle_at_78%_24%,rgba(168,85,247,0.14),transparent_38%),radial-gradient(circle_at_50%_85%,rgba(56,189,248,0.12),transparent_46%)]" />
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.65)_1px,transparent_1px)] [background-size:90px_90px]" />
        <div className="absolute left-[8%] top-[18%] h-72 w-72 rounded-full bg-blue-500/18 blur-[120px]" />
        <div className="absolute right-[6%] top-[30%] h-80 w-80 rounded-full bg-purple-500/16 blur-[140px]" />
        <div className="absolute bottom-[4%] left-[30%] h-96 w-96 rounded-full bg-cyan-400/14 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-10">
        <div className="mb-5 rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-4 shadow-[0_12px_50px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/90">Matt Operator Runtime</p>
              <p className="mt-1 text-sm text-white/75">{activeStep.hint}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Current Stage</p>
              <p className="text-sm font-medium text-white">
                {safeStepIndex + 1}/{FLOW_STEPS.length} • {activeStep.label}
              </p>
            </div>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {FLOW_STEPS.map((entry, index) => {
              const isCurrent = index === safeStepIndex;
              const isDone = index < safeStepIndex;

              return (
                <span
                  key={entry.id}
                  className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
                    isCurrent
                      ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                      : isDone
                        ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                        : "border-white/12 bg-white/[0.03] text-white/55"
                  }`}
                >
                  {entry.label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,470px)_minmax(0,1fr)] lg:gap-10">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.16),transparent_58%)]" />
              <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/15" />
              <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
            </div>

            <div className="relative flex flex-col items-center text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/90">Matt</p>
              <div className="mt-6 h-64 w-64 sm:h-72 sm:w-72">
                <NexusOrb
                  state={
                    step === "deploy"
                      ? "deploying"
                      : step === "demo"
                        ? "thinking"
                        : step === "payment"
                          ? "listening"
                          : "idle"
                  }
                />
              </div>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/75">
                Configure your assistant in one conversation. Matt reacts while you make each decision.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                NEXUS AI | Advanced Capability Platform
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] shadow-[0_25px_100px_rgba(0,0,0,0.42)] backdrop-blur-2xl lg:h-[min(78vh,860px)]"
          >
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/90">Conversation With Matt</p>
                  <p className="mt-1 text-sm text-white/70">{activeStep.hint}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Stage</p>
                  <p className="text-sm font-medium text-white">{safeStepIndex + 1}/{FLOW_STEPS.length}</p>
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {FLOW_STEPS.map((entry, index) => {
                  const isCurrent = index === safeStepIndex;
                  const isDone = index < safeStepIndex;

                  return (
                    <span
                      key={entry.id}
                      className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
                        isCurrent
                          ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                          : isDone
                            ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                            : "border-white/12 bg-white/[0.03] text-white/55"
                      }`}
                    >
                      {entry.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              <div className="mx-auto w-full max-w-4xl">
                <div className="mb-6 space-y-3">
                  <motion.div
                    key={`matt-${step}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className="max-w-3xl rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/90">Matt</p>
                    <p className="mt-1 text-sm leading-relaxed text-cyan-50/95">{mattPrompt}</p>
                  </motion.div>

                  {userNarrative && (
                    <motion.div
                      key={`user-${step}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: 0.06 }}
                      className="ml-auto max-w-3xl rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3"
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">You</p>
                      <p className="mt-1 text-sm leading-relaxed text-white/92">{userNarrative}</p>
                    </motion.div>
                  )}

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/75">
                    <span>Matt is listening</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/90" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/75 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/60 [animation-delay:240ms]" />
                    </span>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {step === "name" && (
                    <motion.div key="name" exit={{ opacity: 0, x: -20 }}>
                      <StepName onSubmit={handleNameSubmit} />
                    </motion.div>
                  )}

                  {step === "personality" && (
                    <motion.div key="personality" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <StepPersonality onSelect={handlePersonalitySelect} />
                    </motion.div>
                  )}

                  {step === "demo" && (
                    <motion.div key="demo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <StepDemo agentName={agentName} personality={personality} onContinue={handleDemoComplete} />
                    </motion.div>
                  )}

                  {step === "payment" && (
                    <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <StepPayment agentName={agentName} onContinue={handlePaymentContinue} />
                    </motion.div>
                  )}

                  {step === "deploy" && (
                    <motion.div key="deploy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                      <StepDeploy
                        agentName={agentName}
                        status={deployStatus}
                        progress={deployProgress}
                        telegramLink={telegramLink}
                        authCode={authCode}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.section>
        </div>

        <div className="mt-5 rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-white/75">
            <span className="text-cyan-100">NEXUS AI | Advanced Capability Platform</span>
            <span>Instant Wizard Chat</span>
            <span>Telegram-Ready Deployment</span>
            <span>$150 First Month</span>
            <span>24/7 AI Operator</span>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        config={config}
        sessionId={`sess_${Date.now()}`}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
