"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { StepName } from "./components/wizard/StepName";
import { StepPersonality } from "./components/wizard/StepPersonality";
import { StepDemo } from "./components/wizard/StepDemo";
import { StepTelegram } from "./components/wizard/StepTelegram";
import { StepPayment } from "./components/wizard/StepPayment";
import { StepDeploy } from "./components/wizard/StepDeploy";
import { PaymentModal } from "./components/PaymentModal";
import {
  ConversationSpine,
  GuideRail,
  LiveCanvas,
} from "./components/wizard/WizardChrome";
import type {
  ConversationItem,
  LiveCanvasStat,
  ProgressTraceItem,
  WizardState,
} from "./components/wizard/types";
import { NexusOrb } from "./components/NexusOrb";

type ActiveStep = "name" | "personality" | "demo" | "telegram" | "payment" | "deploy";
type Step = "idle" | ActiveStep;
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

const FLOW_STEPS: Array<{ id: ActiveStep; label: string; hint: string }> = [
  { id: "name", label: "Name", hint: "Give your operator an identity" },
  { id: "personality", label: "Tone", hint: "Choose how it should sound" },
  { id: "demo", label: "Preview", hint: "Run a short live test" },
  { id: "telegram", label: "Bot", hint: "Connect your Telegram bot" },
  { id: "payment", label: "Launch", hint: "Confirm setup and checkout" },
  { id: "deploy", label: "Deploy", hint: "Provisioning in progress" },
];

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
    "Everything is configured. Confirm the launch shape and choose monthly access or a paid 24-hour pass.",
    "Matt will provision the live runtime against your connected bot right after payment confirmation.",
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

function getStepSubtitle(step: Step, agentName: string) {
  if (step === "name") {
    return "Define the operator identity Matt will carry into the live thread.";
  }
  if (step === "personality") {
    return "Choose the voice before the operator speaks on your behalf.";
  }
  if (step === "demo") {
    return agentName
      ? `Rehearse how ${agentName} should sound before you connect a real bot.`
      : "Rehearse the operator before you connect a real bot.";
  }
  if (step === "telegram") {
    return "Validate the exact Telegram identity Matt will deploy.";
  }
  if (step === "payment") {
    return "Lock the runtime shape and billing window before checkout.";
  }
  if (step === "deploy") {
    return "Stay in the thread while Matt provisions the live runtime.";
  }
  return "Deploy AI agents without leaving the conversation.";
}

function getOperatorHandle(agentName: string) {
  const slug = agentName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || "your_operator";
}

function getWizardState(
  step: Step,
  deployStatus: DeployStatus,
  launchError: string | null,
  telegramBotError: string | null,
): WizardState {
  if (step === "idle") {
    return "idle";
  }

  if (launchError || telegramBotError || (step === "deploy" && deployStatus === "failed")) {
    return "blocked";
  }

  if (step === "deploy" && deployStatus === "completed") {
    return "completed";
  }

  if (step === "deploy") {
    return "generating";
  }

  if (step === "demo" || step === "payment") {
    return "review";
  }

  return "active_guidance";
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
  const narrativeTimeoutsRef = useRef<number[]>([]);
  const [visibleNarrativeCount, setVisibleNarrativeCount] = useState(0);

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
    setPendingAgentId(null);
    setLaunchError(null);
    setAgentName(name);
    setConfig((prev) => ({ ...prev, agentName: name }));
    setStep("personality");
  };

  const handlePersonalitySelect = (value: string) => {
    setPendingAgentId(null);
    setLaunchError(null);
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
    setPendingAgentId(null);
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

      const response = await fetch("/api/telegram/bot/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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

  const createPendingAgent = async (token: string) => {
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

    return data.id as string;
  };

  const handlePaymentContinue = async () => {
    try {
      setIsSubmittingLaunch(true);
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
  const visibleNarrativeMessages = STEP_MESSAGES[activeStep].slice(0, visibleNarrativeCount);
  const isNarrativeStreaming =
    isWizardActive && visibleNarrativeCount < STEP_MESSAGES[activeStep].length;
  const canGoBack =
    step === "personality" ||
    step === "demo" ||
    step === "telegram" ||
    step === "payment";
  const idleOrbSizeClass = "h-[clamp(12.75rem,25vh,16.5rem)] w-[clamp(12.75rem,25vh,16.5rem)]";
  const wizardState = getWizardState(step, deployStatus, launchError, telegramBotError);
  const activeStepMeta = FLOW_STEPS[safeStepIndex];
  const operatorHandle = getOperatorHandle(agentName);
  const blockedMessage =
    telegramBotError ||
    launchError ||
    (step === "deploy" && deployStatus === "failed"
      ? "Deployment did not complete. Retry from the dashboard or return to the launch settings."
      : null);
  const progressItems: ProgressTraceItem[] = FLOW_STEPS.map((entry, index) => ({
    id: entry.id,
    label: entry.label,
    hint: entry.hint,
    status:
      index < safeStepIndex ? "complete" : index === safeStepIndex ? "current" : "upcoming",
  }));
  const conversationItems: ConversationItem[] = visibleNarrativeMessages.map((message, index) => ({
    id: `${activeStep}-${index}-${message}`,
    type: wizardState === "review" && index === visibleNarrativeMessages.length - 1 ? "review" : "prompt",
    body: message,
    emphasis: index === visibleNarrativeMessages.length - 1,
  }));
  const bannerModel = (() => {
    if (wizardState === "blocked") {
      return {
        title: "Matt needs a correction before continuing",
        detail:
          blockedMessage ||
          "The current step is blocked. Fix the required input and the conversation will continue.",
      };
    }

    if (wizardState === "generating") {
      return {
        title: "Runtime generation is in progress",
        detail: "Matt is provisioning the operator, binding Telegram, and checking the live status.",
      };
    }

    if (wizardState === "completed") {
      return {
        title: "Launch completed",
        detail: "The operator is live, connected to Telegram, and ready for the next conversation.",
      };
    }

    if (wizardState === "review") {
      return {
        title: step === "payment" ? "Final launch review" : "Review before launch",
        detail:
          step === "payment"
            ? "Confirm the runtime shape, billing window, and connected identity before checkout."
            : "Use the rehearsal to confirm the tone feels right before you attach a real bot.",
      };
    }

    return {
      title: "Active guidance",
      detail: activeStepMeta.hint,
    };
  })();
  const recoveryModel = blockedMessage
    ? {
        title:
          step === "telegram"
            ? "Telegram validation failed"
            : step === "deploy"
              ? "Deployment needs attention"
              : "Launch preparation is blocked",
        detail: blockedMessage,
      }
    : null;
  const liveCanvasModel = (() => {
    const monthlyLabel = launchOffer === "day_pass" ? "$5 / 24h" : "$150 / month";
    const runtimeLabel = config.useCase === "fleet" ? "Fleet rollout" : "Single operator";
    const identityLabel = telegramBot?.username
      ? `@${telegramBot.username}`
      : telegramBot
        ? "Verified private bot"
        : "Not connected yet";
    const baseDescription =
      "The canvas stays synced to the current stage so the operator, channel, and launch plan remain visible.";

    if (step === "name") {
      const stats: LiveCanvasStat[] = [
        {
          label: "Handle preview",
          value: `@${operatorHandle}`,
          hint: "Preview only. Matt uses this identity in the handoff copy and deployment metadata.",
        },
        {
          label: "First handoff",
          value: `Hi, I'm ${agentName || "your operator"}. I'll keep the thread moving.`,
          hint: "This is the conversational shape the wizard is optimizing for.",
        },
        {
          label: "Runtime",
          value: runtimeLabel,
          hint: "You can still change this at checkout.",
        },
      ];

      return {
        eyebrow: "Live Canvas",
        title: "Operator identity",
        description: baseDescription,
        statusLabel: activeStepMeta.label,
        focusLabel: "Identity preview",
        focusTitle: agentName || "@your_operator",
        focusBody:
          "Set a name that can survive the handoff from Matt into the live Telegram conversation.",
        stats,
        footer: "Naming happens first so every later step stays anchored to one coherent identity.",
      };
    }

    if (step === "personality") {
      const tonePreview =
        personality === "friendly"
          ? "Warm, easy to trust, and conversational."
          : personality === "hustler"
            ? "Direct, urgent, and optimized for speed."
            : "Calm, sharp, and safe for professional threads.";
      const stats: LiveCanvasStat[] = [
        {
          label: "Selected tone",
          value: formatPersonality(personality) || "Professional",
          hint: "This becomes the default reply behavior once the operator is live.",
        },
        {
          label: "Operator",
          value: agentName || "Pending name",
          hint: "Tone and identity travel together into the deployment payload.",
        },
        {
          label: "Voice intent",
          value: tonePreview,
          hint: "The demo step will let you confirm the voice before launch.",
        },
      ];

      return {
        eyebrow: "Live Canvas",
        title: "Voice profile",
        description: baseDescription,
        statusLabel: activeStepMeta.label,
        focusLabel: "Current tone",
        focusTitle: formatPersonality(personality) || "Choose a tone",
        focusBody:
          "Pick the response style Matt should hand into the live relationship once the operator takes over.",
        stats,
        footer: "The next step turns this tone into a short rehearsal thread.",
      };
    }

    if (step === "demo") {
      const stats: LiveCanvasStat[] = [
        {
          label: "Operator",
          value: agentName || "Pending name",
          hint: "The rehearsal uses the identity you set in the first step.",
        },
        {
          label: "Tone",
          value: formatPersonality(personality) || "Professional",
          hint: "The demo is where the operator voice is validated before Telegram is involved.",
        },
        {
          label: "Unlock rule",
          value: "3-message rehearsal",
          hint: "Once the short simulated thread feels right, the flow moves to Telegram.",
        },
      ];

      return {
        eyebrow: "Live Canvas",
        title: "Conversation rehearsal",
        description: baseDescription,
        statusLabel: activeStepMeta.label,
        focusLabel: "Review checkpoint",
        focusTitle: "Short live-feel preview",
        focusBody:
          "Use the demo to see if the operator sounds like someone you would actually trust in the live thread.",
        stats,
        footer: "This step is intentionally lightweight so the wizard stays a continuous conversation instead of a detached simulator.",
      };
    }

    if (step === "telegram") {
      const stats: LiveCanvasStat[] = [
        {
          label: "Identity status",
          value: identityLabel,
          hint: "Matt deploys onto an existing BotFather bot rather than minting a new identity.",
        },
        {
          label: "Validation",
          value: telegramBot ? "Telegram verified" : "Waiting for token",
          hint: "The token is checked before payment so the launch path stays deterministic.",
        },
        {
          label: "Next move",
          value: telegramBot ? "Proceed to launch review" : "Paste and validate bot token",
          hint: "Once verified, the payment step uses this identity directly.",
        },
      ];

      return {
        eyebrow: "Live Canvas",
        title: "Telegram binding",
        description: baseDescription,
        statusLabel: activeStepMeta.label,
        focusLabel: "Channel binding",
        focusTitle: telegramBot?.username ? `@${telegramBot.username}` : "Bring an existing bot",
        focusBody:
          "This is the exact Telegram identity Matt will provision. Nothing changes channels later without your input.",
        stats,
        footer: "Validation happens before checkout so launch failures show up early rather than after payment.",
      };
    }

    if (step === "payment") {
      const stats: LiveCanvasStat[] = [
        {
          label: "Charge",
          value: monthlyLabel,
          hint: launchOffer === "day_pass" ? "Short paid live pass." : "First month of hosted runtime.",
        },
        {
          label: "Runtime shape",
          value: runtimeLabel,
          hint: "Choose between a single operator launch or the wider fleet path.",
        },
        {
          label: "Connected identity",
          value: identityLabel,
          hint: "Matt provisions directly onto the bot already validated in the previous step.",
        },
      ];

      return {
        eyebrow: "Live Canvas",
        title: "Launch summary",
        description: baseDescription,
        statusLabel: activeStepMeta.label,
        focusLabel: "Checkout target",
        focusTitle: monthlyLabel,
        focusBody:
          "This is the final review surface before the payment modal opens and the live deployment starts.",
        stats,
        footer: "Once payment succeeds, the conversation moves into live provisioning without leaving the wizard.",
      };
    }

    const deployProgressLabel =
      deployStatus === "completed"
        ? "100% synchronized"
        : deployStatus === "failed"
          ? "Launch interrupted"
          : `${deployProgress}% synchronized`;
    const stats: LiveCanvasStat[] = [
      {
        label: "Deployment",
        value: deployProgressLabel,
        hint:
          deployStatus === "completed"
            ? "The runtime is live and the bot handoff completed."
            : deployStatus === "failed"
              ? "Provisioning stopped before completion."
              : "Matt is wiring runtime, routing, and Telegram handoff now.",
      },
      {
        label: "Identity",
        value: identityLabel,
        hint: "The launch continues against the verified Telegram bot you selected earlier.",
      },
      {
        label: "Runtime",
        value: runtimeLabel,
        hint: "The chosen launch shape remains visible while the deployment state updates.",
      },
    ];

    return {
      eyebrow: "Live Canvas",
      title: deployStatus === "completed" ? "Runtime online" : "Launch pipeline",
      description: baseDescription,
      statusLabel: deployStatus === "completed" ? "Live" : "Provisioning",
      focusLabel: "Current status",
      focusTitle:
        deployStatus === "completed"
          ? telegramBot?.username
            ? `@${telegramBot.username}`
            : "Connected bot"
          : deployProgressLabel,
      focusBody:
        deployStatus === "completed"
          ? "The operator is live and the Telegram identity is ready to receive the first real conversation."
          : "Stay on this surface while Matt finishes the live runtime and Telegram handoff.",
      stats,
      footer:
        deployStatus === "completed"
          ? "You can open Telegram directly now or continue from the dashboard later."
          : "Keeping the wizard open lets you watch the deployment state without context switching.",
      action:
        deployStatus === "completed" && telegramLink
          ? { href: telegramLink, label: "Open in Telegram" }
          : undefined,
    };
  })();

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
          isWizardActive ? "items-stretch py-4" : "items-center py-1.5"
        }`}
      >
        <motion.div
          className={
            isWizardActive
              ? "wizard-shell h-full min-h-0 w-full max-w-[96rem] overflow-y-auto transition-all duration-700 lg:overflow-hidden"
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
              <GuideRail
                className="order-3 min-h-[19rem] lg:order-1 lg:min-h-0"
                orbState={getOrbState(step)}
                wizardState={wizardState}
                currentTitle={getStepHeading(step, agentName)}
                currentHint={getStepSubtitle(step, agentName)}
                agentName={agentName}
                personality={personality}
                progressItems={progressItems}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key="conversation"
                  initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="order-1 min-h-[28rem] lg:order-2 lg:min-h-0"
                >
                  <ConversationSpine
                    title={getStepHeading(step, agentName)}
                    subtitle={getStepSubtitle(step, agentName)}
                    stageLabel={activeStepMeta.label}
                    stageProgress={`Stage ${safeStepIndex + 1} / ${FLOW_STEPS.length}`}
                    agentName={agentName}
                    personality={personality}
                    canGoBack={canGoBack}
                    onBack={handleBack}
                    wizardState={wizardState}
                    bannerTitle={bannerModel.title}
                    bannerDetail={bannerModel.detail}
                    recoveryTitle={recoveryModel?.title}
                    recoveryDetail={recoveryModel?.detail}
                    conversationItems={conversationItems}
                    isNarrativeStreaming={isNarrativeStreaming}
                  >
                    <AnimatePresence mode="wait">
                      {step === "name" ? (
                        <motion.div
                          key="name"
                          className="h-full min-h-0"
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                        >
                          <StepName onSubmit={handleNameSubmit} />
                        </motion.div>
                      ) : null}

                      {step === "personality" ? (
                        <motion.div
                          key="personality"
                          className="h-full min-h-0"
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                        >
                          <StepPersonality onSelect={handlePersonalitySelect} />
                        </motion.div>
                      ) : null}

                      {step === "demo" ? (
                        <motion.div
                          key="demo"
                          className="h-full min-h-0"
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                        >
                          <StepDemo
                            agentName={agentName}
                            personality={personality}
                            onContinue={handleDemoComplete}
                          />
                        </motion.div>
                      ) : null}

                      {step === "telegram" ? (
                        <motion.div
                          key="telegram"
                          className="h-full min-h-0"
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                        >
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
                        <motion.div
                          key="payment"
                          className="h-full min-h-0"
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                        >
                          <StepPayment
                            agentName={agentName}
                            deploymentMode={config.useCase}
                            launchOffer={launchOffer}
                            botUsername={telegramBot?.username}
                            pricing={launchPricing}
                            errorMessage={launchError}
                            isSubmitting={isSubmittingLaunch}
                            onDeploymentModeChange={(mode) => {
                              setPendingAgentId(null);
                              setLaunchError(null);
                              setConfig((prev) => ({ ...prev, useCase: mode }));
                            }}
                            onLaunchOfferChange={(offer) => {
                              setPendingAgentId(null);
                              setLaunchError(null);
                              setLaunchOffer(offer);
                            }}
                            onContinue={handlePaymentContinue}
                          />
                        </motion.div>
                      ) : null}

                      {step === "deploy" ? (
                        <motion.div
                          key="deploy"
                          className="h-full min-h-0"
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
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
                  </ConversationSpine>
                </motion.div>
              </AnimatePresence>

              <LiveCanvas
                className="order-2 min-h-[18rem] lg:order-3 lg:min-h-0"
                eyebrow={liveCanvasModel.eyebrow}
                title={liveCanvasModel.title}
                description={liveCanvasModel.description}
                statusLabel={liveCanvasModel.statusLabel}
                focusLabel={liveCanvasModel.focusLabel}
                focusTitle={liveCanvasModel.focusTitle}
                focusBody={liveCanvasModel.focusBody}
                stats={liveCanvasModel.stats}
                footer={liveCanvasModel.footer}
                action={liveCanvasModel.action}
              />
            </>
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
