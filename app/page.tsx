"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function Home() {
  const { login, authenticated, user } = usePrivy();
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
    useCase: "assistant",
    scope: "",
    contactMethod: "telegram",
  });

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

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
            ? `Looks right. Let's deploy ${agentName || "it"}.`
            : "Launch now.";

  return (
    <div className="relative h-[calc(100vh-8rem)] overflow-hidden bg-[#03050b] sm:h-[calc(100vh-9rem)]">
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

      <main className="relative z-10 flex h-full w-full items-center justify-center px-4 py-4 md:px-12">
        <motion.div
          className={`flex w-full max-w-6xl items-center justify-center transition-all duration-1000 ${
            isWizardActive ? "flex-col gap-8 lg:flex-row lg:gap-16" : "flex-col gap-8"
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
                className="relative z-20 mt-4 flex h-[65vh] min-h-[500px] max-h-[700px] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1c]/75 shadow-2xl backdrop-blur-xl lg:mt-0"
              >
                <div className="border-b border-white/10 px-4 py-3">
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
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500"
                      initial={{ width: "0%" }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.35 }}
                    />
                  </div>
                </div>

                <div className="mask-image-b flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-28">
                  <motion.div
                    key={`matt-${step}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className="max-w-[90%] rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/90">Matt</p>
                    <p className="mt-1 text-sm leading-relaxed text-cyan-50/95">{mattPrompt}</p>
                  </motion.div>

                  {userNarrative ? (
                    <motion.div
                      key={`user-${step}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: 0.06 }}
                      className="ml-auto max-w-[90%] rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3"
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">You</p>
                      <p className="mt-1 text-sm leading-relaxed text-white/92">{userNarrative}</p>
                    </motion.div>
                  ) : null}

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/75">
                    <span>Matt is listening</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/90" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/75 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300/60 [animation-delay:240ms]" />
                    </span>
                  </div>

                  <AnimatePresence mode="wait">
                    {step === "name" ? (
                      <motion.div key="name" exit={{ opacity: 0, x: -20 }}>
                        <StepName onSubmit={handleNameSubmit} />
                      </motion.div>
                    ) : null}

                    {step === "personality" ? (
                      <motion.div key="personality" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <StepPersonality onSelect={handlePersonalitySelect} />
                      </motion.div>
                    ) : null}

                    {step === "demo" ? (
                      <motion.div key="demo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <StepDemo agentName={agentName} personality={personality} onContinue={handleDemoComplete} />
                      </motion.div>
                    ) : null}

                    {step === "payment" ? (
                      <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <StepPayment agentName={agentName} onContinue={handlePaymentContinue} />
                      </motion.div>
                    ) : null}

                    {step === "deploy" ? (
                      <motion.div key="deploy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
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

                <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-[#05050a] via-[#05050a] to-transparent" />
              </motion.section>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </main>

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
