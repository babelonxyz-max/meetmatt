"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { StepName } from "./components/wizard/StepName";
import { StepDeploy } from "./components/wizard/StepDeploy";
import { PaymentModal } from "./components/PaymentModal";
import { WizardThread } from "./components/wizard/WizardThread";
import { StepRole } from "./components/wizard/StepRole";
import { StepFeatures } from "./components/wizard/StepFeatures";
import { StepLogin } from "./components/wizard/StepLogin";
import { StepToken } from "./components/wizard/StepToken";
import { getOrbState, STEP_ORDER, ROLE_OPTIONS } from "./components/wizard/constants";
import type { Step, StepRecord } from "./components/wizard/types";
import { useIsMobile } from "./hooks/useIsMobile";
import { NexusOrb } from "./components/NexusOrb";

type DeployStatus = "deploying" | "completed" | "failed";
type DeploymentMode = "assistant" | "fleet";
type LaunchOffer = "monthly" | "day_pass";
type TelegramBotProfile = {
  id: string;
  username: string | null;
  firstName: string | null;
  telegramLink: string | null;
};
type LaunchPricing = {
  monthlyPriceUsd: number;
  dayPassPriceUsd: number;
  monthlySource: "default" | "override" | "waived";
  dayPassSource: "default" | "override" | "waived";
  monthlyCardCheckoutEnabled: boolean;
  dayPassCardCheckoutEnabled: boolean;
  billingNotes?: string | null;
};

export default function Home() {
  const { login, authenticated, getAccessToken } = usePrivy();
  const [pendingAgentId, setPendingAgentId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [agentName, setAgentName] = useState("");
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("deploying");
  const [deployProgress, setDeployProgress] = useState(0);
  const [telegramLink, setTelegramLink] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramBot, setTelegramBot] = useState<TelegramBotProfile | null>(null);
  const [telegramBotError, setTelegramBotError] = useState<string | null>(null);
  const [isValidatingTelegramBot, setIsValidatingTelegramBot] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchOffer, setLaunchOffer] = useState<LaunchOffer>("monthly");
  const [isSubmittingLaunch, setIsSubmittingLaunch] = useState(false);
  const [launchPricing, setLaunchPricing] = useState<LaunchPricing | null>(null);
  const [config, setConfig] = useState({
    agentName: "",
    useCase: "assistant" as DeploymentMode,
    scope: "",
    contactMethod: "telegram",
    telegramBotUsername: "",
  });

  const pollCleanupRef = useRef<(() => void) | null>(null);

  // New wizard state
  const [role, setRole] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [history, setHistory] = useState<StepRecord[]>([]);
  const [botHandle, setBotHandle] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const WIZARD_STORAGE_KEY = "meetmatt-wizard-state";

  const saveWizardState = () => {
    const state = { history, agentName, role, features };
    sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  };

  const advanceStep = (fromStep: Step, answer: string | string[], displayAnswer: string, icon?: string) => {
    const mattMessages: Record<string, string> = {
      name: "What should we call them?",
      role: `${agentName} \u2014 great name. What role will ${agentName} play?`,
      features: `An ${role} \u2014 solid. What should ${agentName} handle?`,
      login: "Let\u2019s save your progress.",
      token: `Now let\u2019s connect ${agentName} to Telegram.`,
      deploy: `${agentName} is ready to go live.`,
    };
    setHistory((prev) => [
      ...prev,
      {
        step: fromStep,
        mattMessage: mattMessages[fromStep] || "",
        userAnswer: answer,
        displayAnswer,
        icon,
        timestamp: Date.now(),
      },
    ]);
    const nextIdx = STEP_ORDER.indexOf(fromStep) + 1;
    if (nextIdx < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIdx] as Step);
    }
  };

  const handleEditStep = (targetStep: Step) => {
    const idx = history.findIndex((h) => h.step === targetStep);
    if (idx >= 0) {
      setHistory((prev) => prev.slice(0, idx));
      setStep(targetStep);
    }
  };

  const loadLaunchPricing = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setLaunchPricing(null);
      return;
    }

    try {
      const response = await fetch("/api/payment/quote", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setLaunchPricing((data.pricing as LaunchPricing | undefined) ?? null);
    } catch (error) {
      console.error("Launch pricing fetch error:", error);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!authenticated) {
      setLaunchPricing(null);
      return;
    }

    void loadLaunchPricing();
  }, [authenticated, loadLaunchPricing]);

  // Restore wizard state after Privy auth redirect
  useEffect(() => {
    if (authenticated) {
      const saved = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      if (saved) {
        try {
          const s = JSON.parse(saved);
          if (s.agentName && s.role) {
            setAgentName(s.agentName);
            setRole(s.role);
            setFeatures(s.features || []);
            setHistory([
              ...(s.history || []),
              {
                step: "login" as Step,
                mattMessage: "Let\u2019s save your progress.",
                userAnswer: "Signed in",
                displayAnswer: "\u2713 Signed in",
                icon: "\u2713",
                timestamp: Date.now(),
              },
            ]);
            setStep("token" as Step);
            sessionStorage.removeItem(WIZARD_STORAGE_KEY);
          }
        } catch {
          // ignore corrupted storage
        }
      }
    }
  }, [authenticated]);

  const handleWake = () => {
    if (step !== "idle") return;
    setStep("name");
  };

  const createPendingAgent = async (token: string) => {
    const response = await fetch("/api/agents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        agentName,
        personality: role,
        useCase: config.useCase,
        telegramBotToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to create agent");
    }

    return data.id as string;
  };

  const handlePaymentContinue = async () => {
    try {
      setIsSubmittingLaunch(true);
      setLaunchError(null);

      if (!telegramBotToken.trim()) {
        setStep("token");
        setTelegramBotError("Connect a Telegram bot before checkout.");
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        login();
        return;
      }

      let agentId = pendingAgentId;

      if (!agentId) {
        agentId = await createPendingAgent(token);
        setPendingAgentId(agentId);
      }

      setShowPaymentModal(true);
    } catch (error) {
      console.error("Agent creation error:", error);
      setLaunchError(
        error instanceof Error ? error.message : "Failed to start launch",
      );
    } finally {
      setIsSubmittingLaunch(false);
    }
  };

  const pollAgentStatus = useCallback(
    (id: string) => {
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
    },
    [getAccessToken],
  );

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
    const body = document.body;
    if (isWizardActive) {
      body.dataset.homeWizardActive = "true";
    } else {
      delete body.dataset.homeWizardActive;
    }

    return () => {
      delete body.dataset.homeWizardActive;
    };
  }, [isWizardActive]);

  return (
    <div
      data-home-shell="true"
      className={`brand-shell fixed inset-x-0 top-16 overflow-hidden ${
        isWizardActive ? "bottom-0" : "bottom-14"
      }`}
    >
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
        className={`relative z-10 flex h-full w-full justify-center px-4 md:px-5 ${
          isWizardActive ? "items-stretch py-0" : "items-center py-1.5"
        }`}
      >
        <motion.div
          className={
            isWizardActive
              ? "h-full min-h-0 w-full max-w-[96rem] overflow-hidden transition-all duration-700"
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
                orbClassName="h-[clamp(12.75rem,25vh,16.5rem)] w-[clamp(12.75rem,25vh,16.5rem)]"
              />

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex max-w-4xl flex-col items-center text-center">
                <h1 className="max-w-[11ch] text-[clamp(2rem,4.7vw,3.75rem)] font-bold leading-[0.92] tracking-tight text-white">
                  Deploy AI agents <span className="gradient-text">in minutes.</span>
                </h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed tracking-wide text-white/68 md:text-[15px]">
                  Matt handles onboarding, payment, activation, and follow-through so the relationship doesn&apos;t end at deployment.
                </p>
                <div className="mt-5 flex w-full max-w-4xl flex-wrap justify-center gap-2.5">
                  {[
                    { label: "Deployment", value: "2 min launch" },
                    { label: "Payments", value: "Card or crypto" },
                    { label: "Continuity", value: "Matt stays on thread" },
                  ].map((item) => (
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
            <div className="min-h-full relative" data-home-wizard-active>
              {/* Orb + Chat as one centered composition */}
              {isMobile ? (
                <div className="flex items-center justify-center py-6 sticky top-0 z-20 bg-[#0a0a0f]/90 backdrop-blur-md">
                  <div className="absolute w-[120px] h-[120px] rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.12)_0%,transparent_70%)] blur-[20px]" />
                  <NexusOrb size="sm" state={getOrbState(step)} variant="plasma" />
                </div>
              ) : (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[5]">
                  <div className="w-full max-w-[1060px] mx-auto flex items-center px-8">
                    {/* Orb */}
                    <div className="relative flex flex-col items-center justify-center flex-shrink-0" style={{ width: "clamp(240px, 24vw, 320px)" }}>
                      <div className="absolute w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.12)_0%,rgba(255,107,53,0.04)_40%,transparent_70%)] blur-[40px]" />
                      <NexusOrb
                        state={getOrbState(step)}
                        variant="plasma"
                        orbClassName="h-[clamp(11rem,18vw,15rem)] w-[clamp(11rem,18vw,15rem)]"
                      />
                      <div className="mt-5 text-[#444] text-[11px] tracking-[3px] uppercase">MATT</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conversation — same centered max-width, offset to the right half */}
              <div className={isMobile ? "px-6 pb-12" : "relative z-10 min-h-screen flex items-center"}>
                <div className={isMobile ? "" : "w-full max-w-[1060px] mx-auto flex px-8"}>
                  {/* Spacer matching orb width */}
                  {!isMobile && <div className="flex-shrink-0" style={{ width: "clamp(240px, 24vw, 320px)" }} />}
                  {/* Chat zone */}
                  <div className={isMobile ? "" : "flex-1 pl-10 max-w-[520px]"}>
                <WizardThread
                  history={history}
                  currentStep={step}
                  stepIndicator={`Step ${STEP_ORDER.indexOf(step) + 1} of ${STEP_ORDER.length}`}
                  onEditStep={handleEditStep}
                  mattMessage={
                    step === "name"
                      ? "Hey \u2014 I\u2019m Matt. I\u2019ll help you build and deploy your AI agent in about two minutes."
                      : undefined
                  }
                >
                  {step === "name" && (
                    <StepName
                      onSubmit={(name) => {
                        setAgentName(name);
                        setConfig((prev) => ({ ...prev, agentName: name }));
                        advanceStep("name", name, name);
                      }}
                    />
                  )}
                  {step === "role" && (
                    <StepRole
                      agentName={agentName}
                      onSelect={(r) => {
                        setRole(r);
                        const roleObj = ROLE_OPTIONS.find((o) => o.id === r);
                        advanceStep("role", r, roleObj?.label || r);
                      }}
                    />
                  )}
                  {step === "features" && (
                    <StepFeatures
                      agentName={agentName}
                      role={role}
                      onSubmit={(f) => {
                        setFeatures(f);
                        advanceStep("features", f, f.join(", "));
                      }}
                    />
                  )}
                  {step === "login" && (
                    <StepLogin
                      agentName={agentName}
                      onGoogle={() => {
                        saveWizardState();
                        login();
                      }}
                      onEmail={() => {
                        saveWizardState();
                        login();
                      }}
                      onWallet={() => {
                        saveWizardState();
                        login();
                      }}
                    />
                  )}
                  {step === "token" && (
                    <StepToken
                      agentName={agentName}
                      isValidating={isValidatingTelegramBot}
                      botHandle={botHandle}
                      error={telegramBotError}
                      onSubmit={async (token) => {
                        try {
                          setIsValidatingTelegramBot(true);
                          setTelegramBotError(null);
                          setTelegramBotToken(token);
                          const response = await fetch("/api/telegram/bot/validate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ telegramBotToken: token }),
                          });
                          const data = await response.json();
                          if (!response.ok) throw new Error(data.error || "Failed to validate");
                          const bot = data.bot as TelegramBotProfile;
                          setTelegramBot(bot);
                          setBotHandle(bot.username || null);
                          setConfig((prev) => ({ ...prev, telegramBotUsername: bot.username || "" }));
                          advanceStep("token", token, `@${bot.username}`, "\u2713");
                        } catch (err) {
                          setTelegramBotError(err instanceof Error ? err.message : "Validation failed");
                        } finally {
                          setIsValidatingTelegramBot(false);
                        }
                      }}
                    />
                  )}
                  {step === "deploy" && (
                    <StepDeploy
                      agentName={agentName}
                      role={role}
                      features={features}
                      botHandle={botHandle}
                      deployStatus={deployStatus}
                      progress={deployProgress}
                      telegramLink={telegramLink}
                      onDeploy={async (offer) => {
                        setLaunchOffer(offer);
                        await handlePaymentContinue();
                      }}
                      onRetry={() => handlePaymentContinue()}
                    />
                  )}
                </WizardThread>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        config={config}
        launchOffer={launchOffer}
        agentId={pendingAgentId}
        pricing={launchPricing}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
