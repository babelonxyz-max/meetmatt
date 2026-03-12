"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft } from "lucide-react";
import { StepName } from "./components/wizard/StepName";
import { StepPersonality } from "./components/wizard/StepPersonality";
import { StepDemo } from "./components/wizard/StepDemo";
import { StepTelegram } from "./components/wizard/StepTelegram";
import { StepPayment } from "./components/wizard/StepPayment";
import { StepDeploy } from "./components/wizard/StepDeploy";
import { PaymentModal } from "./components/PaymentModal";
import { NexusOrb } from "./components/NexusOrb";

type ActiveStep = "name" | "personality" | "demo" | "telegram" | "payment" | "deploy";
type Step = "idle" | ActiveStep;
type DeployStatus = "deploying" | "completed" | "failed";
type DeploymentMode = "assistant" | "fleet";
type TelegramBotProfile = {
  id: string;
  username: string | null;
  firstName: string | null;
  telegramLink: string | null;
};

const FLOW_STEPS: Array<{ id: ActiveStep; label: string; hint: string }> = [
  { id: "name", label: "Name", hint: "Give your operator an identity" },
  { id: "personality", label: "Tone", hint: "Choose how it should sound" },
  { id: "demo", label: "Preview", hint: "Run a short live test" },
  { id: "telegram", label: "Bot", hint: "Connect your Telegram bot" },
  { id: "payment", label: "Launch", hint: "Confirm setup and checkout" },
  { id: "deploy", label: "Deploy", hint: "Provisioning in progress" },
];

const STEP_PROMPTS: Record<Step, string> = {
  idle: "Deploy AI agents in minutes. Ready to start?",
  name: "Give your operator a clear name before it joins the thread.",
  personality: "Choose the tone people will feel when the operator replies.",
  demo: "Run a short live preview before you launch it for real.",
  telegram: "Connect the BotFather token for the Telegram bot this operator should use.",
  payment: "Confirm the deployment setup and continue to checkout.",
  deploy: "Matt is provisioning everything now and will finish the handoff.",
};

const STEP_MESSAGES: Record<ActiveStep, string[]> = {
  name: [
    "Welcome. Let's start with stage 1 of 5.",
    "Choose a clear name for your operator before it joins the thread.",
    "I'll use this name in the first handoff and on the deployed Telegram bot.",
  ],
  personality: [
    "Stage 2 of 5.",
    "Now pick the tone people should feel when your operator replies.",
    "This becomes the voice Matt hands into the conversation.",
  ],
  demo: [
    "Stage 3 of 5.",
    "Run a short simulated thread before launch.",
    "Use the preview to confirm the tone feels right before going live.",
  ],
  telegram: [
    "Stage 4 of 5.",
    "Automatic bot creation is not live yet, so connect your existing BotFather token.",
    "Matt will deploy against that exact Telegram bot, not mint a new one.",
  ],
  payment: [
    "Stage 5 of 5.",
    "Everything is configured. Confirm the launch shape and continue to payment.",
    "After checkout, Matt provisions the live runtime against your connected bot.",
  ],
  deploy: [
    "Deployment in progress.",
    "Matt is wiring the runtime, reply logic, and bot handoff now.",
    "Stay here for the live status or open the dashboard later if needed.",
  ],
};

const IDLE_HIGHLIGHTS = [
  { label: "Deployment", value: "15 min launch" },
  { label: "Payments", value: "Card or crypto" },
  { label: "Continuity", value: "Matt stays on thread" },
];

function formatPersonality(personality: string) {
  if (!personality) return "Not set";
  return personality.charAt(0).toUpperCase() + personality.slice(1);
}

function getStepHeading(step: Step, agentName: string) {
  if (step === "name") return "Name your operator";
  if (step === "personality") return "Choose the tone";
  if (step === "demo") return agentName ? `Preview ${agentName}` : "Preview the operator";
  if (step === "telegram") return "Connect Telegram bot";
  if (step === "payment") return "Confirm deployment";
  if (step === "deploy") return agentName ? `Launching ${agentName}` : "Launching";
  return "Deploy AI agents";
}

function getOrbState(step: Step) {
  if (step === "payment" || step === "telegram") return "listening";
  if (step === "deploy") return "speaking";
  if (step === "demo") return "thinking";
  return "idle";
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramBot, setTelegramBot] = useState<TelegramBotProfile | null>(null);
  const [telegramBotError, setTelegramBotError] = useState<string | null>(null);
  const [isValidatingTelegramBot, setIsValidatingTelegramBot] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [config, setConfig] = useState({
    agentName: "",
    useCase: "assistant" as DeploymentMode,
    scope: "",
    contactMethod: "telegram",
    telegramBotUsername: "",
  });

  const pollCleanupRef = useRef<(() => void) | null>(null);
  const narrativeTimeoutsRef = useRef<number[]>([]);
  const [visibleNarrativeCount, setVisibleNarrativeCount] = useState(0);

  const handleWake = () => {
    if (step !== "idle") return;
    setStep("name");
  };

  const handleBack = () => {
    if (step === "personality") {
      setStep("name");
      return;
    }
    if (step === "demo") {
      setStep("personality");
      return;
    }
    if (step === "telegram") {
      setStep("demo");
      return;
    }
    if (step === "payment") {
      setStep("telegram");
    }
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
    setStep("telegram");
  };

  const handleTelegramTokenChange = (value: string) => {
    setTelegramBotToken(value);
    setTelegramBot(null);
    setTelegramBotError(null);
    setLaunchError(null);
    setConfig((prev) => ({ ...prev, telegramBotUsername: "" }));
  };

  const handleTelegramContinue = async () => {
    try {
      setIsValidatingTelegramBot(true);
      setTelegramBotError(null);
      setLaunchError(null);

      const token = await getAccessToken();
      if (!token) {
        login();
        return;
      }

      const response = await fetch("/api/telegram/bot/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          telegramBotToken,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to validate Telegram bot");
      }

      const validatedBot = data.bot as TelegramBotProfile;
      setTelegramBot(validatedBot);
      setConfig((prev) => ({
        ...prev,
        telegramBotUsername: validatedBot.username || "",
      }));
      setStep("payment");
    } catch (error) {
      setTelegramBotError(
        error instanceof Error ? error.message : "Failed to validate Telegram bot",
      );
    } finally {
      setIsValidatingTelegramBot(false);
    }
  };

  const handlePaymentContinue = async () => {
    try {
      setLaunchError(null);

      if (!telegramBotToken.trim()) {
        setStep("telegram");
        setTelegramBotError("Connect a Telegram bot before checkout.");
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        login();
        return;
      }

      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentName,
          personality,
          useCase: config.useCase,
          telegramBotToken,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create agent");
      }

      setPendingAgentId(data.id);
      setShowPaymentModal(true);
    } catch (error) {
      console.error("Agent creation error:", error);
      setLaunchError(
        error instanceof Error ? error.message : "Failed to create agent",
      );
    }
  };

  const pollAgentStatus = useCallback((id: string) => {
    pollCleanupRef.current?.();

    const interval = setInterval(async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch(`/api/agents/status?agentId=${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
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
          setTelegramLink(
            agent.telegramLink ||
              (agent.botUsername ? `https://t.me/${agent.botUsername}` : ""),
          );
          cleanup();
        } else if (agent.status === "error") {
          setDeployStatus("failed");
          cleanup();
        }
      } catch (error) {
        console.error("Poll error:", error);
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

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setStep("deploy");

    if (pendingAgentId) {
      pollAgentStatus(pendingAgentId);
    } else {
      setDeployStatus("failed");
    }
  };

  const isWizardActive = step !== "idle";
  const activeStep = step === "idle" ? "name" : step;
  const currentStepIndex = isWizardActive ? FLOW_STEPS.findIndex((entry) => entry.id === step) : 0;
  const safeStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  const mattPrompt = STEP_PROMPTS[step];
  const visibleNarrativeMessages = STEP_MESSAGES[activeStep].slice(0, visibleNarrativeCount);
  const isNarrativeStreaming =
    isWizardActive && visibleNarrativeCount < STEP_MESSAGES[activeStep].length;
  const canGoBack =
    step === "personality" ||
    step === "demo" ||
    step === "telegram" ||
    step === "payment";
  const idleOrbSizeClass = "h-[clamp(12.75rem,25vh,16.5rem)] w-[clamp(12.75rem,25vh,16.5rem)]";

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflowY;
    const previousBodyOverflow = body.style.overflowY;

    html.style.overflowY = "hidden";
    body.style.overflowY = "hidden";

    return () => {
      html.style.overflowY = previousHtmlOverflow;
      body.style.overflowY = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    narrativeTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    narrativeTimeoutsRef.current = [];

    if (!isWizardActive) {
      setVisibleNarrativeCount(0);
      return;
    }

    setVisibleNarrativeCount(0);

    STEP_MESSAGES[activeStep].forEach((_, index) => {
      const timeoutId = window.setTimeout(() => {
        setVisibleNarrativeCount(index + 1);
      }, 180 + index * 720);
      narrativeTimeoutsRef.current.push(timeoutId);
    });

    return () => {
      narrativeTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      narrativeTimeoutsRef.current = [];
    };
  }, [activeStep, isWizardActive]);

  return (
    <div data-home-shell="true" className="brand-shell fixed inset-x-0 top-16 bottom-14 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="brand-dot-grid absolute inset-x-[4%] top-10 bottom-20 opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_76%)]" />
        <div className="absolute left-[8%] top-[18%] h-[24rem] w-[24rem] rounded-full bg-[#ff6b35]/20 blur-[110px] mix-blend-screen" />
        <div className="absolute right-[6%] top-[10%] h-[20rem] w-[20rem] rounded-full bg-[#ffaa44]/12 blur-[110px] mix-blend-screen" />
        <div className="absolute bottom-[8%] right-[12%] h-[24rem] w-[26rem] rounded-full bg-[#ff875a]/12 blur-[130px] mix-blend-screen" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(255,255,255,0.03), transparent 18%, transparent 82%, rgba(255,170,68,0.05))",
          }}
        />
      </div>

      <main
        className={`relative z-10 flex h-full w-full justify-center px-4 py-2 md:px-6 ${
          isWizardActive ? "items-stretch" : "items-center"
        }`}
      >
        <motion.div
          className={
            isWizardActive
              ? "grid h-full min-h-0 w-full max-w-[86rem] grid-cols-1 grid-rows-[minmax(10.5rem,13rem)_minmax(0,1fr)] gap-3 overflow-hidden transition-all duration-700 lg:grid-cols-[minmax(19rem,0.92fr)_minmax(0,1.08fr)] lg:grid-rows-1 lg:gap-6"
              : "flex h-full max-h-full w-full max-w-6xl flex-col items-center justify-center gap-4 overflow-hidden transition-all duration-700"
          }
        >
          {!isWizardActive ? (
            <div className="relative flex shrink-0 flex-col items-center justify-center">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="brand-pill mb-4">
                <span className="brand-kicker">Matt relationship layer</span>
              </motion.div>

              <NexusOrb
                state={getOrbState(step)}
                variant="plasma"
                onClick={handleWake}
                className="mb-5 md:mb-6"
                orbClassName={idleOrbSizeClass}
              />

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex max-w-4xl flex-col items-center text-center">
                <h1 className="max-w-[11ch] text-[clamp(2rem,4.7vw,3.75rem)] font-bold leading-[0.92] tracking-tight text-white">
                  Deploy AI agents <span className="gradient-text">in minutes.</span>
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed tracking-wide text-white/68 md:text-[15px]">
                  Matt handles onboarding, payment, activation, and follow-through so the relationship doesn&apos;t end at deployment.
                </p>
                <div className="mt-5 flex w-full max-w-4xl flex-wrap justify-center gap-2.5">
                  {IDLE_HIGHLIGHTS.map((item) => (
                    <div
                      key={item.label}
                      className="brand-panel brand-noise min-w-[11rem] rounded-full px-4 py-2.5 text-left shadow-[0_18px_60px_rgba(0,0,0,0.36)]"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffd3a7]/85">{item.label}</p>
                      <p className="mt-1 text-sm font-medium leading-none text-white/90">{item.value}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleWake}
                  className="brand-button mt-5 px-7 py-3 text-sm font-semibold uppercase tracking-[0.18em]"
                >
                  Start With Matt
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              <div className="flex min-h-0 flex-col">
                <div className="wizard-matt-stage h-full min-h-0">
                  <div className="wizard-matt-base" />
                  <div className="wizard-matt-pedestal" />
                  <NexusOrb
                    state={getOrbState(step)}
                    variant="plasma"
                    className="relative z-10"
                    orbClassName="h-[clamp(9.5rem,20vw,13rem)] w-[clamp(9.5rem,20vw,13rem)] lg:h-[clamp(17rem,32vw,25rem)] lg:w-[clamp(17rem,32vw,25rem)]"
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.section
                  key="wizard"
                  initial={{ opacity: 0, x: 50, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 20, filter: "blur(8px)" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative z-20 flex min-h-0 w-full flex-col overflow-hidden"
                >
                  <div className="wizard-stage-divider" />

                  <div className="wizard-chat-stack mt-4">
                    <AnimatePresence initial={false}>
                      {visibleNarrativeMessages.map((message, index) => (
                        <motion.div
                          key={`${activeStep}-${index}`}
                          initial={{ opacity: 0, x: 18, y: 12, filter: "blur(8px)" }}
                          animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
                          exit={{ opacity: 0, x: -10, y: -6, filter: "blur(6px)" }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                          className={`wizard-chat-bubble text-left text-[clamp(1.02rem,1.7vw,1.16rem)] font-medium leading-[1.12] text-white/92 ${
                            index === 0 ? "wizard-chat-bubble-accent" : ""
                          }`}
                        >
                          {message}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {isNarrativeStreaming ? (
                      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-white/56">
                        Matt is briefing you
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ffaa44]/90" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9a60]/75 [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff6835]/60 [animation-delay:240ms]" />
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 wizard-content-shell flex h-full min-h-0 flex-col p-4 md:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {canGoBack ? (
                          <button
                            type="button"
                            onClick={handleBack}
                            className="brand-button-secondary inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-white/80 transition-colors hover:text-white"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                          </button>
                        ) : null}
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-white/34">
                            Chat wizard
                          </p>
                          <h2 className="mt-1 text-[1.2rem] font-semibold tracking-tight text-white">
                            {getStepHeading(step, agentName)}
                          </h2>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/62">
                          Stage {safeStepIndex + 1} / {FLOW_STEPS.length}
                        </span>
                        {agentName ? (
                          <span className="rounded-full border border-[#ffb075]/18 bg-[#ffaa44]/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#ffe3c5]">
                            {agentName}
                          </span>
                        ) : null}
                        {personality ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/62">
                            {formatPersonality(personality)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 h-[1px] bg-white/8" />

                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/52">
                      {mattPrompt}
                    </p>

                    <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                      <AnimatePresence mode="wait">
                        {step === "name" ? (
                          <motion.div key="name" className="h-full min-h-0" exit={{ opacity: 0, x: -20 }}>
                            <StepName onSubmit={handleNameSubmit} />
                          </motion.div>
                        ) : null}

                        {step === "personality" ? (
                          <motion.div key="personality" className="h-full min-h-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <StepPersonality onSelect={handlePersonalitySelect} />
                          </motion.div>
                        ) : null}

                        {step === "demo" ? (
                          <motion.div key="demo" className="h-full min-h-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <StepDemo agentName={agentName} personality={personality} onContinue={handleDemoComplete} />
                          </motion.div>
                        ) : null}

                        {step === "telegram" ? (
                          <motion.div key="telegram" className="h-full min-h-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <StepTelegram
                              token={telegramBotToken}
                              bot={telegramBot}
                              isValidating={isValidatingTelegramBot}
                              errorMessage={telegramBotError}
                              onTokenChange={handleTelegramTokenChange}
                              onContinue={handleTelegramContinue}
                            />
                          </motion.div>
                        ) : null}

                        {step === "payment" ? (
                          <motion.div key="payment" className="h-full min-h-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <StepPayment
                              agentName={agentName}
                              deploymentMode={config.useCase}
                              botUsername={telegramBot?.username}
                              errorMessage={launchError}
                              onDeploymentModeChange={(mode) => setConfig((prev) => ({ ...prev, useCase: mode }))}
                              onContinue={handlePaymentContinue}
                            />
                          </motion.div>
                        ) : null}

                        {step === "deploy" ? (
                          <motion.div key="deploy" className="h-full min-h-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <StepDeploy
                              agentName={agentName}
                              status={deployStatus}
                              progress={deployProgress}
                              telegramLink={telegramLink}
                              botUsername={telegramBot?.username || undefined}
                            />
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.section>
              </AnimatePresence>
            </>
          )}
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
