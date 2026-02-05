"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Check, ArrowRight, Zap, Shield, Clock } from "lucide-react";
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

// Single plan: $5/day = $150/month
const PLAN = {
  name: "MATT",
  dailyPrice: 5,
  monthlyPrice: 150,
  setupPrice: 150, // First month includes setup
  features: ["Unlimited agents", "Unlimited requests", "All features included", "Priority support", "24/7 availability"]
};

const PURPOSE_SUGGESTIONS = [
  { id: "web-app", label: "Build a web app", icon: "🌐" },
  { id: "data-analysis", label: "Analyze data", icon: "📊" },
  { id: "automation", label: "Automation", icon: "⚡" },
  { id: "research", label: "Research", icon: "🔍" },
  { id: "support", label: "Customer support", icon: "💬" },
  { id: "content", label: "Content creation", icon: "✍️" },
];

const FEATURES_LIST = [
  { id: "Code generation", icon: "⚡", description: "Generate and edit code" },
  { id: "Web browsing", icon: "🌐", description: "Browse and extract web data" },
  { id: "API integration", icon: "🔌", description: "Connect to external APIs" },
  { id: "File management", icon: "📁", description: "Read and write files" },
  { id: "Database", icon: "🗄️", description: "Database operations" },
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
  const purposeInputRef = useRef<HTMLTextAreaElement>(null);

  // Map step to wizard state for orb reactions
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

  // Auto-focus name input when entering name step
  useEffect(() => {
    if (step === "name" && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 300);
    }
    if (step === "purpose" && purposeInputRef.current) {
      setTimeout(() => purposeInputRef.current?.focus(), 300);
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
      // Clear relevant config
      if (prevStep === "name") setConfig(prev => ({ ...prev, agentName: "" }));
      if (prevStep === "purpose") setConfig(prev => ({ ...prev, purpose: "" }));
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
      `Great! ${name} it is. ✨\n\nWhat would you like ${name} to help you with?`,
      PURPOSE_SUGGESTIONS.map(s => `${s.icon} ${s.label}`)
    );
  };

  const handlePurposeSelect = async (suggestionLabel: string) => {
    await enableAudio();
    playOptionSelected();
    setConfig((prev) => ({ ...prev, purpose: suggestionLabel }));
    addMessage("user", suggestionLabel);
    setInput("");
    setStep("features");
    await simulateTyping("Perfect! Now let's choose what capabilities your agent should have. Select all that apply:");
  };

  const handlePurposeSubmit = async () => {
    if (!input.trim()) return;
    await enableAudio();
    playMessageSent();
    const purpose = input.trim();
    setConfig((prev) => ({ ...prev, purpose }));
    addMessage("user", purpose);
    setInput("");
    setStep("features");
    await simulateTyping("Perfect! Now let's choose what capabilities your agent should have. Select all that apply:");
  };

  const handleFeatureSelect = async (feature: string) => {
    await enableAudio();
    playOptionSelected();
    setConfig((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleFeaturesConfirm = async () => {
    if (config.features.length === 0) return;
    await enableAudio();
    playOptionSelected();
    addMessage("user", `Selected: ${config.features.join(", ")}`);
    setStep("confirm");
    await simulateTyping(
      `Ready to deploy ${config.agentName}! 🚀\n\n**Plan:** $${PLAN.dailyPrice}/day ($${PLAN.monthlyPrice}/month)\n**Includes:** ${PLAN.features.join(", ")}`,
      ["Proceed to payment"]
    );
  };

  const handleConfirm = async (action: string) => {
    await enableAudio();
    if (action === "Proceed to payment") {
      playOptionSelected();
      savePendingConfig({ ...config, createdAt: Date.now() });
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = async () => {
    playSuccess();
    setShowPayment(false);
    setIsDeploying(true);
    setStep("deploying");
    addMessage("assistant", "Initializing deployment sequence...", []);

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
      addMessage("assistant", `🎉 ${config.agentName} is now live and ready to work!`, ["View Dashboard", "Deploy another"]);
    } catch (error: any) {
      setIsDeploying(false);
      setStep("confirm");
      addMessage("assistant", `Deployment error: ${error.message}. Retry?`, ["Retry deployment"]);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (step === "name") handleNameSubmit();
    else if (step === "purpose") handlePurposeSubmit();
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
    } else if (option.startsWith("🌐") || option.startsWith("📊") || option.startsWith("⚡") || 
               option.startsWith("🔍") || option.startsWith("💬") || option.startsWith("✍️")) {
      // Purpose suggestions
      handlePurposeSelect(option);
    } else if (step === "features") {
      handleFeatureSelect(option);
    } else if (step === "confirm" || step === "success") {
      if (option === "View Dashboard") {
        window.location.href = '/dashboard';
      } else if (option === "Deploy another") {
        setStep("intro");
        setConfig({ agentName: "", purpose: "", features: [] });
        setMessages([{
          id: "restart",
          role: "assistant",
          content: "Hello. I am MATT, your AI deployment assistant. I can help you create and deploy AI agents in minutes. No signup required.",
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
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[var(--muted)] font-mono"
        >
          INITIALIZING SYSTEM...
        </motion.div>
      </div>
    );
  }

  return (
    <main className="fixed inset-0 pt-14 pb-safe bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex flex-col lg:flex-row">
      {/* Left Side - AI Orb Visual */}
      <div className="lg:w-[42%] h-[32%] lg:h-full flex flex-col items-center justify-center relative safe-area-padding">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--background)]/50 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative z-10"
        >
          <AIOrb 
            isListening={isTyping} 
            isThinking={isDeploying} 
            intensity={isDeploying ? "high" : "medium"}
            wizardState={getWizardState()}
          />
        </motion.div>

        <motion.div 
          className="mt-4 lg:mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-xl lg:text-2xl font-semibold mb-1 tracking-wider">MATT</h1>
          <p className="text-[10px] lg:text-xs font-mono text-[var(--muted)]">
            {isTyping ? "PROCESSING..." : isDeploying ? "DEPLOYING..." : "SYSTEM READY"}
          </p>
        </motion.div>

        {/* Theme toggle */}
        <div className="absolute bottom-4 left-4 z-20">
          <ThemeToggle />
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="lg:w-[58%] h-[68%] lg:h-full flex flex-col bg-gradient-to-l from-[var(--card)]/20 to-transparent relative">
        <JarvisInterface
          messages={messages}
          isTyping={isTyping}
          isDeploying={isDeploying}
          canGoBack={canGoBack}
          onBack={handleBack}
          onOptionClick={handleOptionClick}
        >
          {/* Name Input Step - Prominent Design */}
          <AnimatePresence mode="wait">
            {step === "name" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 lg:p-6 space-y-4"
              >
                <div className="text-center mb-4">
                  <p className="text-sm text-[var(--muted)]">Enter a name for your AI agent</p>
                </div>
                <div className="flex gap-3">
                  <Input
                    ref={nameInputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => enableAudio()}
                    placeholder="e.g., Jarvis, Helper, Assistant..."
                    className="flex-1 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] h-14 text-lg font-medium"
                  />
                  <Button
                    onClick={handleNameSubmit}
                    disabled={!input.trim()}
                    className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-14 px-6 disabled:opacity-50"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Purpose Step - Pickable Suggestions + Write Option */}
            {step === "purpose" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 lg:p-6 space-y-4"
              >
                <p className="text-sm text-[var(--muted)] text-center mb-2">Choose from suggestions or describe your own</p>
                
                {/* Suggestion Pills */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {PURPOSE_SUGGESTIONS.map((suggestion) => (
                    <motion.button
                      key={suggestion.id}
                      onClick={() => handlePurposeSelect(`${suggestion.icon} ${suggestion.label}`)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] hover:border-[#0ea5e9]/50 hover:bg-[#0ea5e9]/10 text-sm transition-all"
                    >
                      {suggestion.icon} {suggestion.label}
                    </motion.button>
                  ))}
                </div>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border)]" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-[var(--background)] text-xs text-[var(--muted)]">or write your own</span>
                  </div>
                </div>

                {/* Custom Input */}
                <div className="flex gap-3">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => enableAudio()}
                    placeholder="Describe what you need help with..."
                    className="flex-1 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] h-12"
                  />
                  <Button
                    onClick={handlePurposeSubmit}
                    disabled={!input.trim()}
                    className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-12 px-4 disabled:opacity-50 whitespace-nowrap"
                  >
                    <span className="mr-2">Proceed</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Features Selection - Unified Style */}
            {step === "features" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 lg:p-6 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FEATURES_LIST.map((feature) => {
                    const isSelected = config.features.includes(feature.id);
                    return (
                      <motion.button
                        key={feature.id}
                        onClick={() => handleFeatureSelect(feature.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]"
                            : "bg-[var(--card)] border-[var(--border)] hover:border-[#0ea5e9]/50"
                        }`}
                      >
                        <span className="text-xl">{feature.icon}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isSelected ? "text-[#0ea5e9]" : ""}`}>
                            {feature.id}
                          </p>
                          <p className="text-xs text-[var(--muted)]">{feature.description}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#0ea5e9] flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                
                {config.features.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleFeaturesConfirm}
                    className="w-full py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Proceed with selected ({config.features.length})
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Confirm Step - Single Plan */}
            {step === "confirm" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 lg:p-6"
              >
                <div className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{PLAN.name}</h3>
                        <p className="text-xs text-[var(--muted)]">Everything you need</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#0ea5e9]">${PLAN.dailyPrice}</p>
                      <p className="text-xs text-[var(--muted)]">per day</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {PLAN.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-[#0ea5e9]" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-[var(--muted)]">First month (includes setup)</span>
                      <span className="font-semibold">${PLAN.setupPrice}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-[var(--muted)]">Monthly recurring</span>
                      <span className="font-semibold">${PLAN.monthlyPrice}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </JarvisInterface>

        {/* Safe area footer spacer */}
        <div className="h-safe-bottom" />
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
