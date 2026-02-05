"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentModal } from "./components/PaymentModal";
import { AIOrb } from "./components/AIOrb";
import { JarvisInterface } from "./components/JarvisInterface";
import { ThemeToggle } from "./components/ThemeToggle";
import { getOrCreateSessionId, savePendingConfig, clearPendingConfig } from "@/lib/session";
import { 
  initAudio, 
  playMessageSent, 
  playMessageReceived, 
  playOptionSelected, 
  playSuccess, 
  playHover,
  playTyping 
} from "@/lib/audio";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: string[];
}

type Step = "intro" | "name" | "purpose" | "features" | "tier" | "confirm";

interface SetupConfig {
  agentName: string;
  purpose: string;
  features: string[];
  tier: "starter" | "pro" | "enterprise";
}

const FEATURES_LIST = [
  { id: "Code generation", icon: "⚡", description: "Generate and edit code" },
  { id: "Web browsing", icon: "🌐", description: "Browse and extract web data" },
  { id: "API integration", icon: "🔌", description: "Connect to external APIs" },
  { id: "File management", icon: "📁", description: "Read and write files" },
  { id: "Database", icon: "🗄️", description: "Database operations" },
];

const TIERS = [
  { 
    id: "starter" as const, 
    name: "Starter", 
    price: 29, 
    description: "Perfect for personal projects",
    features: ["1 agent", "100 requests/day", "Basic features"]
  },
  { 
    id: "pro" as const, 
    name: "Pro", 
    price: 99, 
    description: "For growing businesses",
    features: ["5 agents", "1,000 requests/day", "All features", "Priority support"]
  },
  { 
    id: "enterprise" as const, 
    name: "Enterprise", 
    price: 299, 
    description: "For large teams",
    features: ["Unlimited agents", "Unlimited requests", "Custom integrations", "24/7 support"]
  },
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
    tier: "starter",
  });
  const [step, setStep] = useState<Step>("intro");
  const [showPayment, setShowPayment] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

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
    const stepOrder: Step[] = ["intro", "name", "purpose", "features", "tier", "confirm"];
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
    }
  };

  const startDeployment = async () => {
    await enableAudio();
    setStep("name");
    playOptionSelected();
    setTimeout(() => {
      simulateTyping("What shall we name your AI agent?");
    }, 200);
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
      `Acknowledged. ${name} registered. What is the primary function of this agent?`,
      ["Building a web app", "Analyzing data", "Automation", "Research", "Customer support", "Content creation"]
    );
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
    await simulateTyping("Select capabilities to enable. Multiple selections permitted.");
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
    playTyping();
  };

  const handleFeaturesConfirm = async () => {
    if (config.features.length === 0) return;
    await enableAudio();
    playOptionSelected();
    addMessage("user", config.features.join(", "));
    setStep("tier");
    await simulateTyping("Select deployment tier.");
  };

  const handleTierSelect = async (tierId: "starter" | "pro" | "enterprise") => {
    await enableAudio();
    playOptionSelected();
    const tier = TIERS.find(t => t.id === tierId)!;
    setConfig((prev) => ({ ...prev, tier: tierId }));
    addMessage("user", `${tier.name} Tier ($${tier.price}/mo)`);
    setStep("confirm");
    await simulateTyping(
      `Configuration complete. Ready to deploy ${config.agentName} on ${tier.name} tier. Proceed with deployment?`,
      ["Confirm deployment"]
    );
  };

  const handleConfirm = async (action: string) => {
    await enableAudio();
    if (action === "Confirm deployment") {
      playOptionSelected();
      savePendingConfig({ ...config, createdAt: Date.now() });
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = async () => {
    playSuccess();
    setShowPayment(false);
    setIsDeploying(true);
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
      addMessage("assistant", `Deployment successful. ${config.agentName} is now active and ready for operation.`, []);
    } catch (error: any) {
      setIsDeploying(false);
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
    } else if (step === "features") {
      handleFeatureSelect(option);
    } else if (step === "tier") {
      // handled separately
    } else if (step === "confirm") {
      handleConfirm(option);
    }
  };

  const canGoBack = step !== "intro" && step !== "confirm" && !isDeploying;

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[var(--background)] flex items-center justify-center">
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
    <main className="fixed top-14 bottom-0 left-0 right-0 w-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex flex-col lg:flex-row">
      {/* Left Side - AI Orb Visual - Blended */}
      <div className="lg:w-[42%] h-[35%] lg:h-full flex flex-col items-center justify-center relative">
        {/* Subtle vignette effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--background)]/50 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative z-10"
        >
          <AIOrb isListening={isTyping} isThinking={isDeploying} intensity={isDeploying ? "high" : "medium"} />
        </motion.div>

        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-2xl font-semibold mb-1 tracking-wider">MATT</h1>
          <p className="text-xs font-mono text-[var(--muted)]">
            {isTyping ? "PROCESSING..." : isDeploying ? "DEPLOYING..." : "SYSTEM READY"}
          </p>
        </motion.div>

        {/* Theme toggle - bottom left */}
        <div className="absolute bottom-4 left-4">
          <ThemeToggle />
        </div>
      </div>

      {/* Right Side - Jarvis Interface - Blended */}
      <div className="lg:w-7/12 h-[70vh] lg:h-full bg-gradient-to-l from-[var(--card)]/20 to-transparent">
        <JarvisInterface
          messages={messages}
          isTyping={isTyping}
          isDeploying={isDeploying}
          canGoBack={canGoBack}
          onBack={handleBack}
          onOptionClick={handleOptionClick}
        >
          {/* Feature Selection UI */}
          {step === "features" && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FEATURES_LIST.map((feature) => {
                  const isSelected = config.features.includes(feature.id);
                  return (
                    <motion.button
                      key={feature.id}
                      onClick={() => handleFeatureSelect(feature.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]"
                          : "bg-[var(--card)] border-[var(--border)] hover:border-[#0ea5e9]/50"
                      }`}
                    >
                      <span className="text-lg">{feature.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isSelected ? "text-[#0ea5e9]" : ""}`}>
                          {feature.id}
                        </p>
                        <p className="text-xs text-[var(--muted)]">{feature.description}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4" />}
                    </motion.button>
                  );
                })}
              </div>
              {config.features.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleFeaturesConfirm}
                  className="w-full py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  CONFIRM ({config.features.length} SELECTED)
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          )}

          {/* Tier Selection UI */}
          {step === "tier" && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {TIERS.map((tier) => (
                  <motion.button
                    key={tier.id}
                    onClick={() => handleTierSelect(tier.id)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      config.tier === tier.id
                        ? "bg-[#0ea5e9]/20 border-[#0ea5e9]"
                        : "bg-[var(--card)] border-[var(--border)] hover:border-[#0ea5e9]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{tier.name}</span>
                      <span className="text-lg font-bold text-[#0ea5e9]">${tier.price}<span className="text-sm text-[var(--muted)]">/mo</span></span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mb-2">{tier.description}</p>
                    <ul className="space-y-1">
                      {tier.features.map((f, i) => (
                        <li key={i} className="text-xs text-[var(--muted)] flex items-center gap-1">
                          <span className="w-1 h-1 bg-[#0ea5e9] rounded-full" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          {(step === "name" || step === "purpose") && (
            <div className="p-4 border-t border-[var(--border)]">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => enableAudio()}
                  placeholder={step === "name" ? "Enter agent designation..." : "Describe primary function..."}
                  className="flex-1 bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] h-12 font-mono"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-12 w-12 p-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
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

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 lg:left-auto lg:w-[58%] lg:left-[42%] py-2 px-4 z-40 border-t border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm h-10 flex items-center">
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
          <span>SECURE CONNECTION</span>
          <span>ENCRYPTED</span>
        </div>
      </footer>
    </main>
  );
}
