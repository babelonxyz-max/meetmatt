"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { StepName } from "./components/wizard/StepName";
import { StepPersonality } from "./components/wizard/StepPersonality";
import { StepDemo } from "./components/wizard/StepDemo";
import { StepPayment } from "./components/wizard/StepPayment";
import { StepDeploy } from "./components/wizard/StepDeploy";
import { PaymentModal } from "./components/PaymentModal";
import { NexusOrb } from "./components/NexusOrb";

type ActiveStep = "name" | "personality" | "demo" | "payment" | "deploy";
type Step = "idle" | ActiveStep;
type DeployStatus = "deploying" | "completed" | "failed";
type DeploymentMode = "assistant" | "fleet";

interface NarrativeMessage {
  id: string;
  role: "matt" | "you";
  text: string;
}

const FLOW_STEPS: Array<{ id: ActiveStep; label: string; hint: string }> = [
  { id: "name", label: "Name", hint: "Give your assistant an identity" },
  { id: "personality", label: "Style", hint: "Choose interaction style" },
  { id: "demo", label: "Demo", hint: "Try a short conversation" },
  { id: "payment", label: "Payment", hint: "Confirm deployment plan" },
  { id: "deploy", label: "Launch", hint: "Provisioning in progress" },
];

const STEP_PROMPTS: Record<Step, string> = {
  idle: "Create AI-superpowered Assistant in minutes. Ready to start?",
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

function createNarrativeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Home() {
  const { login, authenticated, getAccessToken } = usePrivy();
  const [pendingAgentId, setPendingAgentId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [agentName, setAgentName] = useState("");
  const [personality, setPersonality] = useState("");
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("deploying");
  const [deployProgress, setDeployProgress] = useState(0);
  const [telegramLink, setTelegramLink] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [config, setConfig] = useState({
    agentName: "",
    useCase: "assistant" as DeploymentMode,
    scope: "",
    contactMethod: "telegram",
  });
  const [narrativeMessages, setNarrativeMessages] = useState<NarrativeMessage[]>([]);
  const narrativeStepRef = useRef<Step>("idle");
  const narrativeTimersRef = useRef<number[]>([]);

  const handleWake = () => {
    if (step !== "idle") return;
    setStep("name");
  };

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

  const handlePaymentContinue = async () => {
    // Create agent before opening payment modal
    try {
      const token = await getAccessToken();
      if (!token) {
        login();
        return;
      }
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentName,
          personality,
          useCase: config.useCase,
        }),
      });

      if (!response.ok) throw new Error("Failed to create agent");

      const data = await response.json();
      setPendingAgentId(data.id);
      setShowPaymentModal(true);
    } catch (error) {
      console.error("Agent creation error:", error);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setStep("deploy");

    // Agent already created — payment webhook triggers deployment.
    // Just poll for status updates.
    if (pendingAgentId) {
      pollAgentStatus(pendingAgentId);
    } else {
      setDeployStatus("failed");
    }
  };

  const pollCleanupRef = useRef<(() => void) | null>(null);

  const pollAgentStatus = useCallback((id: string) => {
    // Clean up any previous polling
    pollCleanupRef.current?.();

    const interval = setInterval(async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch(`/api/agents/status?agentId=${id}`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
        });
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
          cleanup();
        } else if (agent.status === "error") {
          setDeployStatus("failed");
          cleanup();
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 3000);

    const timeoutId = setTimeout(() => {
      setDeployStatus("failed");
      cleanup();
    }, 5 * 60 * 1000);

    const cleanup = () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
      pollCleanupRef.current = null;
    };

    pollCleanupRef.current = cleanup;
  }, [getAccessToken]);

  const isWizardActive = step !== "idle";
  const currentStepIndex = isWizardActive ? FLOW_STEPS.findIndex((entry) => entry.id === step) : 0;
  const safeStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  const progressPercent = isWizardActive ? (safeStepIndex / (FLOW_STEPS.length - 1)) * 100 : 0;
  const activeStep = FLOW_STEPS[safeStepIndex];
  const mattPrompt = STEP_PROMPTS[step];

  const userNarrative =
    !isWizardActive || step === "name"
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
            ? config.useCase === "fleet"
              ? `Looks right. Let's deploy the ${agentName || "assistant"} fleet.`
              : `Looks right. Let's deploy ${agentName || "it"}.`
            : "Launch now.";

  const pushNarrativeMessage = useCallback((role: NarrativeMessage["role"], text: string) => {
    setNarrativeMessages((prev) => [...prev, { id: createNarrativeId(), role, text }].slice(-8));
  }, []);

  useEffect(() => {
    narrativeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    narrativeTimersRef.current = [];

    if (!isWizardActive) {
      setNarrativeMessages([]);
      narrativeStepRef.current = "idle";
      return;
    }

    if (narrativeStepRef.current === step) return;
    narrativeStepRef.current = step;

    const mattTimer = window.setTimeout(() => {
      pushNarrativeMessage("matt", mattPrompt);
    }, 120);
    narrativeTimersRef.current.push(mattTimer);

    if (userNarrative) {
      const userTimer = window.setTimeout(() => {
        pushNarrativeMessage("you", userNarrative);
      }, 520);
      narrativeTimersRef.current.push(userTimer);
    }

    return () => {
      narrativeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      narrativeTimersRef.current = [];
    };
  }, [isWizardActive, step, mattPrompt, userNarrative, pushNarrativeMessage]);

  const visibleNarrativeMessages = narrativeMessages.slice(-5);

  return (
    <div data-home-shell="true" className="fixed inset-x-0 top-16 bottom-16 overflow-hidden bg-[#03050b] sm:top-20">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-[30rem] w-[40rem] rounded-full bg-purple-900/20 blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 h-[40rem] w-[50rem] rounded-full bg-blue-900/20 blur-[150px] mix-blend-screen" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "100px 100px",
          }}
        />
      </div>

      <main className="relative z-10 flex h-full w-full items-center justify-center px-4 py-3 md:px-10">
        <motion.div
          className={`flex h-full w-full max-w-6xl items-center justify-center transition-all duration-700 ${
            isWizardActive ? "flex-col gap-6 lg:flex-row lg:gap-10" : "flex-col gap-6"
          }`}
        >
          <div className="flex shrink-0 flex-col items-center">
            {!isWizardActive ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 shadow-lg backdrop-blur-md"
              >
                Hi! I&apos;m Matt!
              </motion.div>
            ) : null}

            <NexusOrb
              state={step === "payment" ? "listening" : step === "deploy" ? "speaking" : step === "demo" ? "thinking" : "idle"}
              variant="plasma"
              onClick={handleWake}
              className="h-56 w-56 md:h-64 md:w-64"
            />

            {!isWizardActive ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-center">
                <h1 className="mb-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
                  Create <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">AI-superpowered</span> Assistant
                </h1>
                <p className="text-sm tracking-wide text-gray-400 md:text-base">in minutes.</p>
              </motion.div>
            ) : (
              <div className="mt-6 flex flex-wrap justify-center gap-1.5">
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
            )}
          </div>

          <AnimatePresence mode="wait">
            {isWizardActive ? (
              <motion.section
                key="wizard"
                initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 20, filter: "blur(8px)" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-20 mt-3 flex h-full min-h-0 w-full max-w-[30rem] flex-col overflow-hidden lg:mt-0"
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(34,211,238,0.11),transparent_38%),radial-gradient(circle_at_78%_80%,rgba(168,85,247,0.1),transparent_42%)]" />
                </div>
                <div className="px-2 py-2">
                  <div className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/90">Conversation With Matt</p>
                        <p className="mt-1 text-xs text-white/70">{activeStep.hint}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">Stage</p>
                        <p className="text-xs font-medium text-white">{safeStepIndex + 1}/{FLOW_STEPS.length}</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10 shadow-inner">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-500 to-violet-400 shadow-[0_0_18px_rgba(34,211,238,0.6)]"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.35 }}
                      />
                    </div>
                  </div>
                </div>

                <div className="relative flex min-h-0 flex-1 flex-col px-2 py-2">
                  <div className="relative h-52 overflow-hidden">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[rgba(8,8,20,0.95)] to-transparent" />
                    <div className="flex h-full flex-col justify-end gap-2">
                      <AnimatePresence initial={false}>
                        {visibleNarrativeMessages.map((message, index) => {
                          const age = (index + 1) / visibleNarrativeMessages.length;
                          const bubbleOpacity = 0.32 + age * 0.68;

                          return (
                            <motion.div
                              key={message.id}
                              layout
                              initial={{ opacity: 0, y: 14, scale: 0.98 }}
                              animate={{ opacity: bubbleOpacity, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -14 }}
                              transition={{ duration: 0.24, ease: "easeOut" }}
                              className={`max-w-[92%] rounded-2xl px-4 py-2.5 backdrop-blur-xl ${
                                message.role === "matt"
                                  ? "border border-cyan-300/40 bg-[linear-gradient(135deg,rgba(34,211,238,0.2),rgba(14,116,144,0.15))] text-cyan-50/95 shadow-[0_10px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]"
                                  : "ml-auto border border-white/25 bg-[linear-gradient(135deg,rgba(168,85,247,0.16),rgba(59,130,246,0.12))] text-white/92 shadow-[0_10px_28px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]"
                              }`}
                            >
                              <p className={`text-[10px] uppercase tracking-[0.16em] ${message.role === "matt" ? "text-cyan-100/90" : "text-white/70"}`}>
                                {message.role === "matt" ? "Matt" : "You"}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed">{message.text}</p>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-[11px] text-white/80 shadow-[0_0_20px_rgba(34,211,238,0.18)] backdrop-blur-md">
                    <span>Matt is listening</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/90" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/75 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/60 [animation-delay:240ms]" />
                    </span>
                  </div>

                  <div className="mt-1 min-h-0 flex-1 p-1">
                    <AnimatePresence mode="wait">
                      {step === "name" ? (
                        <motion.div key="name" className="h-full" exit={{ opacity: 0, x: -20 }}>
                          <StepName onSubmit={handleNameSubmit} />
                        </motion.div>
                      ) : null}

                      {step === "personality" ? (
                        <motion.div key="personality" className="h-full" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                          <StepPersonality onSelect={handlePersonalitySelect} />
                        </motion.div>
                      ) : null}

                      {step === "demo" ? (
                        <motion.div key="demo" className="h-full" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                          <StepDemo agentName={agentName} personality={personality} onContinue={handleDemoComplete} />
                        </motion.div>
                      ) : null}

                      {step === "payment" ? (
                        <motion.div key="payment" className="h-full" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                          <StepPayment
                            agentName={agentName}
                            deploymentMode={config.useCase}
                            onDeploymentModeChange={(mode) => setConfig((prev) => ({ ...prev, useCase: mode }))}
                            onContinue={handlePaymentContinue}
                          />
                        </motion.div>
                      ) : null}

                      {step === "deploy" ? (
                        <motion.div key="deploy" className="h-full" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                          <StepDeploy
                            agentName={agentName}
                            status={deployStatus}
                            progress={deployProgress}
                            telegramLink={telegramLink}
                            authCode={authCode}
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </main>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        config={config}
        agentId={pendingAgentId}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
