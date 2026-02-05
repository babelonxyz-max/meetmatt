"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Check, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentModal } from "./components/PaymentModal";
import { AIOrb, type AIOrbProps } from "./components/AIOrb";
import { JarvisInterface } from "./components/JarvisInterface";
import { ThemeToggle } from "./components/ThemeToggle";
import { getOrCreateSessionId, savePendingConfig, clearPendingConfig } from "@/lib/session";
import { 
  initAudio, 
  playMessageSent, 
  playMessageReceived, 
  playOptionSelected, 
  playSuccess
} from "@/lib/audio";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: string[];
}

type Step = "intro" | "name" | "purpose" | "features" | "confirm" | "deploying" | "success";

interface SetupConfig {
  agentName: string;
  purpose: string;
  features: string[];
}

// Single plan
const PLAN_PRICE = 150;

const PURPOSE_OPTIONS = [
  { id: "web-app", label: "Build a web app", icon: "🌐" },
  { id: "data-analysis", label: "Analyze data", icon: "📊" },
  { id: "automation", label: "Automation", icon: "⚡" },
  { id: "research", label: "Research", icon: "🔍" },
  { id: "support", label: "Customer support", icon: "💬" },
  { id: "content", label: "Content creation", icon: "✍️" },
];

const FEATURE_OPTIONS = [
  { id: "Code generation", label: "Code generation", icon: "⚡" },
  { id: "Web browsing", label: "Web browsing", icon: "🌐" },
  { id: "API integration", label: "API integration", icon: "🔌" },
  { id: "File management", label: "File management", icon: "📁" },
  { id: "Database", label: "Database", icon: "🗄️" },
];

export default function Home() {
  const [sessionId] = useState<string>(() => getOrCreateSessionId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<SetupConfig>({
    agentName: "",
    purpose: "",
    features: [],
  });
  const [step, setStep] = useState<Step>("intro");
  const [showPayment, setShowPayment] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const getWizardState = (): AIOrbProps["wizardState"] => {
    if (step === "intro") return "idle";
    if (step === "name") return "initializing";
    if (step === "purpose" || step === "features") return "processing";
    if (step === "deploying") return "deploying";
    if (step === "success") return "success";
    return "idle";
  };

  const enableAudio = useCallback(async () => {
    if (!audioEnabled) {
      try {
        await initAudio();
        setAudioEnabled(true);
      } catch (e) {
        console.log("Audio init failed:", e);
      }
    }
  }, [audioEnabled]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Hello. I am MATT, your AI deployment assistant. I can help you create and deploy AI agents in minutes. No signup required.",
        options: ["Initialize deployment"],
      }]);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Auto-focus name input
  useEffect(() => {
    if (step === "name" && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 300);
    }
  }, [step]);

  const addMessage = (role: "assistant" | "user", content: string, options?: string[]) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role, content, options }]);
    if (role === "assistant" && audioEnabled) {
      playMessageReceived();
    }
  };

  const simulateTyping = async (content: string, options?: string[]) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));
    setIsTyping(false);
    addMessage("assistant", content, options);
  };

  const handleBack = async () => {
    await enableAudio();
    const stepOrder: Step[] = ["intro", "name", "purpose", "features", "confirm"];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1];
      setStep(prevStep);
      setMessages((prev) => {
        const newMessages = [...prev];
        while (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "user") {
          newMessages.pop();
        }
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "assistant") {
          newMessages.pop();
        }
        return newMessages;
      });
      if (prevStep === "name") setConfig(prev => ({ ...prev, agentName: "" }));
      if (prevStep === "purpose") setConfig(prev => ({ ...prev, purpose: "" }));
      if (prevStep === "features") setConfig(prev => ({ ...prev, features: [] }));
    }
  };

  const startDeployment = async () => {
    await enableAudio();
    playOptionSelected();
    setStep("name");
    setTimeout(() => {
      simulateTyping("Let's create your AI agent! What would you like to name it?");
    }, 600);
  };

  const handleNameSubmit = async () => {
    if (!input.trim()) return;
    await enableAudio();
    playMessageSent();
    const name = input.trim();
    setConfig((prev) => ({ ...prev, agentName: name }));
    addMessage("user", name);
    setInput("");
    setStep("purpose");
    await simulateTyping(
      `Great! ${name} it is. What would you like ${name} to help you with?`,
      PURPOSE_OPTIONS.map(o => `${o.icon} ${o.label}`)
    );
  };

  const handlePurposeSelect = async (option: string) => {
    await enableAudio();
    playOptionSelected();
    // Extract label from option (remove emoji)
    const label = option.replace(/^\S+\s/, "");
    setConfig((prev) => ({ ...prev, purpose: label }));
    addMessage("user", label);
    setStep("features");
    await simulateTyping(
      "Perfect! Select all capabilities your agent should have:",
      FEATURE_OPTIONS.map(o => `${o.icon} ${o.label}`)
    );
  };

  const handleFeatureToggle = async (option: string) => {
    await enableAudio();
    const featureId = option.replace(/^\S+\s/, "");
    setConfig((prev) => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter((f) => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  const handleFeaturesConfirm = async () => {
    if (config.features.length === 0) return;
    await enableAudio();
    playOptionSelected();
    addMessage("user", config.features.join(", "));
    setStep("confirm");
    await simulateTyping(
      `Ready to deploy **${config.agentName}**! 🚀\n\nPlan: $${PLAN_PRICE}/mo (unlimited everything)`,
      ["Proceed to payment"]
    );
  };

  const handleConfirm = async (action: string) => {
    await enableAudio();
    if (action === "Proceed to payment") {
      playOptionSelected();
      savePendingConfig({
        agentName: config.agentName,
        purpose: config.purpose,
        features: config.features,
        createdAt: Date.now(),
      });
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = async () => {
    playSuccess();
    setShowPayment(false);
    setIsDeploying(true);
    setStep("deploying");
    addMessage("assistant", "Initializing deployment...", []);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, sessionId }),
      });

      if (!response.ok) {
        throw new Error('Deployment failed');
      }

      clearPendingConfig();
      setIsDeploying(false);
      setStep("success");
      addMessage("assistant", `🎉 ${config.agentName} is now live!`, ["View Dashboard", "Deploy another"]);
    } catch (error: any) {
      setIsDeploying(false);
      setStep("confirm");
      addMessage("assistant", `Error: ${error.message}. Retry?`, ["Retry deployment"]);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (step === "name") handleNameSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOptionClick = async (option: string) => {
    await enableAudio();
    if (option === "Initialize deployment") {
      startDeployment();
    } else if (step === "purpose") {
      handlePurposeSelect(option);
    } else if (step === "features") {
      handleFeatureToggle(option);
    } else if (step === "confirm" || step === "success") {
      if (option === "View Dashboard") {
        window.location.href = '/dashboard';
      } else if (option === "Deploy another") {
        setStep("intro");
        setConfig({ agentName: "", purpose: "", features: [] });
        setMessages([{
          id: "restart",
          role: "assistant",
          content: "Hello. I am MATT, your AI deployment assistant.",
          options: ["Initialize deployment"],
        }]);
      } else {
        handleConfirm(option);
      }
    }
  };

  const canGoBack = step !== "intro" && step !== "confirm" && !isDeploying && step !== "success";

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[var(--background)] flex items-center justify-center safe-area-padding">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-[var(--muted)] font-mono">
          INITIALIZING...
        </motion.div>
      </div>
    );
  }

  return (
    <main className="fixed inset-0 pt-14 pb-safe bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex flex-col lg:flex-row">
      {/* Left Side - AI Orb */}
      <div className="lg:w-[42%] h-[35%] lg:h-full flex flex-col items-center justify-center relative">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="relative z-10 w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64">
          <AIOrb 
            isListening={isTyping} 
            isThinking={isDeploying} 
            intensity={isDeploying ? "high" : "medium"}
            wizardState={getWizardState()}
          />
        </motion.div>

        <motion.div className="mt-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <h1 className="text-xl lg:text-2xl font-semibold mb-1 tracking-wider">MATT</h1>
          <p className="text-[10px] lg:text-xs font-mono text-[var(--muted)]">
            {isTyping ? "PROCESSING..." : isDeploying ? "DEPLOYING..." : "SYSTEM READY"}
          </p>
        </motion.div>

        <div className="absolute bottom-4 left-4 z-20">
          <ThemeToggle />
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="lg:w-[58%] h-[65%] lg:h-full flex flex-col bg-gradient-to-l from-[var(--card)]/20 to-transparent">
        <JarvisInterface
          messages={messages}
          isTyping={isTyping}
          isDeploying={isDeploying}
          canGoBack={canGoBack}
          onBack={handleBack}
          onOptionClick={handleOptionClick}
        >
          <AnimatePresence mode="wait">
            {/* NAME STEP - Starts at top, input below messages */}
            {step === "name" && (
              <motion.div
                key="name-step"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 border-t border-[var(--border)]"
              >
                <div className="max-w-md mx-auto">
                  <p className="text-xs text-[var(--muted)] mb-3 text-center">Enter your agent's name</p>
                  <div className="flex gap-2">
                    <Input
                      ref={nameInputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => enableAudio()}
                      placeholder="e.g., Jarvis, Helper..."
                      className="flex-1 bg-[var(--card)] border-[var(--border)] h-12 text-base"
                    />
                    <Button
                      onClick={handleNameSubmit}
                      disabled={!input.trim()}
                      className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-12 px-5 disabled:opacity-50"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PURPOSE STEP - Multi-select style */}
            {step === "purpose" && (
              <motion.div
                key="purpose-step"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 border-t border-[var(--border)]"
              >
                <p className="text-xs text-[var(--muted)] mb-3 text-center">Select what you need help with</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                  {PURPOSE_OPTIONS.map((option) => (
                    <motion.button
                      key={option.id}
                      onClick={() => handlePurposeSelect(`${option.icon} ${option.label}`)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2.5 rounded-full bg-[var(--card)] border border-[var(--border)] hover:border-[#0ea5e9] hover:bg-[#0ea5e9]/10 text-sm transition-all flex items-center gap-2"
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* FEATURES STEP - Multi-select with confirm */}
            {step === "features" && (
              <motion.div
                key="features-step"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 border-t border-[var(--border)]"
              >
                <p className="text-xs text-[var(--muted)] mb-3 text-center">
                  {config.features.length === 0 ? "Select capabilities (choose multiple)" : `${config.features.length} selected`}
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto mb-4">
                  {FEATURE_OPTIONS.map((option) => {
                    const isSelected = config.features.includes(option.id);
                    return (
                      <motion.button
                        key={option.id}
                        onClick={() => handleFeatureToggle(`${option.icon} ${option.id}`)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2.5 rounded-full border text-sm transition-all flex items-center gap-2 ${
                          isSelected
                            ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]"
                            : "bg-[var(--card)] border-[var(--border)] hover:border-[#0ea5e9]/50"
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                      </motion.button>
                    );
                  })}
                </div>
                
                {config.features.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <Button
                      onClick={handleFeaturesConfirm}
                      className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-6"
                    >
                      Continue ({config.features.length})
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* CONFIRM STEP */}
            {step === "confirm" && (
              <motion.div
                key="confirm-step"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 border-t border-[var(--border)]"
              >
                <div className="max-w-sm mx-auto bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">MATT Plan</h3>
                      <p className="text-xs text-[var(--muted)]">Unlimited everything</p>
                    </div>
                  </div>
                  <div className="text-center py-2 border-t border-[var(--border)]">
                    <span className="text-3xl font-bold text-[#0ea5e9]">${PLAN_PRICE}</span>
                    <span className="text-sm text-[var(--muted)]">/mo</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </JarvisInterface>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          config={config}
          sessionId={sessionId}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </main>
  );
}
