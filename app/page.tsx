"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, ArrowRight, User, Bot, Sparkles, Shield, Zap, Clock, ChevronLeft, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentModal } from "./components/PaymentModal";
import { AIOrb } from "./components/AIOrb";
import { getOrCreateSessionId, savePendingConfig, clearPendingConfig } from "@/lib/session";
import { initAudio, playMessageSent, playMessageReceived, playOptionSelected, playSuccess, playHover } from "@/lib/audio";
import Link from "next/link";

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
  // Initialize session ID immediately (not async)
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const enableAudio = useCallback(async () => {
    if (!audioEnabled) {
      try {
        await initAudio();
        setAudioEnabled(true);
      } catch (e) {
        console.log("Audio init failed (user interaction needed first):", e);
      }
    }
  }, [audioEnabled]);

  // Initial welcome message
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Hi, I'm Matt. I help you deploy AI assistants in minutes. No signup needed—just tell me what you need.",
        options: ["Let's get started"],
      }]);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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
      // Remove last assistant message and user's response
      setMessages((prev) => {
        const newMessages = [...prev];
        // Remove last 2 messages (assistant question + user answer)
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

  const handleRetry = async () => {
    await enableAudio();
    // Remove error message and try again
    setMessages((prev) => prev.slice(0, -1));
    setIsDeploying(false);
    // Re-trigger deployment
    handleConfirm("Confirm & pay");
  };

  const startDeployment = async () => {
    await enableAudio();
    setStep("name");
    playOptionSelected();
    setTimeout(() => {
      simulateTyping("What should we name your AI assistant?");
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
      `Great, ${name} it is. What will ${name} help you with?`,
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
    await simulateTyping(
      "What capabilities should I enable? You can select multiple.",
    );
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
    addMessage("user", `${config.features.join(", ")}`);
    setStep("tier");
    await simulateTyping(
      "Which plan works for you? Click a tier to see details.",
    );
  };

  const handleTierSelect = async (tierId: "starter" | "pro" | "enterprise") => {
    await enableAudio();
    playOptionSelected();
    const tier = TIERS.find(t => t.id === tierId)!;
    setConfig((prev) => ({ ...prev, tier: tierId }));
    addMessage("user", `${tier.name} ($${tier.price}/mo)`);
    setStep("confirm");
    await simulateTyping(
      `Ready to deploy ${config.agentName} on the ${tier.name} plan?`,
      ["Confirm & pay"]
    );
  };

  const handleConfirm = async (action: string) => {
    await enableAudio();
    if (action === "Confirm & pay") {
      playOptionSelected();
      savePendingConfig({ ...config, createdAt: Date.now() });
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = async () => {
    playSuccess();
    setShowPayment(false);
    setIsDeploying(true);
    addMessage("assistant", "Setting things up...", []);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Deployment failed');
      }

      clearPendingConfig();
      setIsDeploying(false);
      addMessage("assistant", `All set! ${config.agentName} is ready. You can manage it from your dashboard.`, ["Go to dashboard"]);
    } catch (error: any) {
      setIsDeploying(false);
      addMessage("assistant", `Something went wrong: ${error.message}. Would you like to try again?`, ["Try again"]);
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
    if (option === "Let's get started") {
      startDeployment();
    } else if (option === "Try again") {
      handleRetry();
    } else if (step === "features") {
      handleFeatureSelect(option);
    } else if (step === "tier") {
      // This won't be called directly anymore since we show tier cards
    } else if (step === "confirm") {
      handleConfirm(option);
    } else if (option === "Go to dashboard") {
      window.location.href = '/dashboard';
    }
  };

  const canGoBack = step !== "intro" && step !== "confirm" && !isDeploying;

  return (
    <main className="h-[100dvh] w-screen bg-[#0a0a0b] text-white overflow-hidden flex flex-col lg:flex-row">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(14,165,233,0.15) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(99,102,241,0.1) 0%, transparent 50%)`,
        }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -50, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md">
        <div className="h-14 px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onMouseEnter={() => audioEnabled && playHover()}>
            <Sparkles className="w-5 h-5 text-[#0ea5e9]" />
            <span className="font-semibold">Meet Matt</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="hidden sm:inline">Online</span>
            </div>
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors" onMouseEnter={() => audioEnabled && playHover()}>
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Left Side - AI Orb Visual */}
      <div className="lg:w-5/12 h-[35vh] lg:h-full flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-r border-white/5 pt-14">
        <div className="absolute top-16 left-4 w-8 h-8 border-l-2 border-t-2 border-[#0ea5e9]/30" />
        <div className="absolute top-16 right-4 w-8 h-8 border-r-2 border-t-2 border-[#0ea5e9]/30" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[#0ea5e9]/30" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#0ea5e9]/30" />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative z-10"
        >
          <AIOrb isListening={isTyping} isThinking={isDeploying} />
        </motion.div>

        <motion.div 
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-2xl font-semibold mb-1">Meet Matt</h1>
          <p className="text-sm text-zinc-500">
            {isTyping ? "Matt is typing..." : isDeploying ? "Deploying..." : isLoading ? "Loading..." : "Ready to help"}
          </p>
        </motion.div>

        <div className="lg:hidden flex items-center gap-4 mt-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> No KYC</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Instant</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 2 min setup</span>
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="lg:w-7/12 h-[65vh] lg:h-full flex flex-col bg-[#0a0a0b]/50 backdrop-blur-sm pt-14">
        {/* Chat header */}
        <div className="h-12 px-4 border-b border-white/5 flex items-center gap-3 bg-[#0a0a0b]/80 backdrop-blur">
          {canGoBack && (
            <button
              onClick={handleBack}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-1"
              title="Go back"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-400" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-medium">Matt</span>
            <span className="text-xs text-zinc-500 ml-2">AI Deployment Assistant</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-[#0ea5e9] animate-spin" />
                <span className="text-sm text-zinc-500">Loading...</span>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-3 max-w-[90%] lg:max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === "assistant" 
                        ? "bg-gradient-to-br from-[#0ea5e9] to-[#6366f1]" 
                        : "bg-white/10"
                    }`}>
                      {message.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    
                    <div
                      className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                        message.role === "user"
                          ? "bg-[#0ea5e9] text-white rounded-br-md"
                          : "bg-white/5 border border-white/10 text-zinc-200 rounded-bl-md"
                      }`}
                    >
                      {message.content}
                      
                      {message.options && step !== "features" && step !== "tier" && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {message.options.map((option) => {
                            const isPrimary = option.includes("get started") || option.includes("Confirm") || option.includes("dashboard") || option.includes("Try again");
                            
                            return (
                              <motion.button
                                key={option}
                                onClick={() => handleOptionClick(option)}
                                disabled={isDeploying}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onMouseEnter={() => audioEnabled && playHover()}
                                className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                                  isPrimary
                                    ? "bg-white text-black hover:bg-zinc-200"
                                    : "bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10"
                                }`}
                              >
                                {option.includes("Try again") && <RefreshCw className="w-3 h-3 inline mr-1" />}
                                {option}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Feature Selection UI */}
              {step === "features" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 max-w-[90%]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                      <p className="text-sm text-zinc-300 mb-3">Select the features you need:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {FEATURES_LIST.map((feature) => {
                          const isSelected = config.features.includes(feature.id);
                          return (
                            <motion.button
                              key={feature.id}
                              onClick={() => handleFeatureSelect(feature.id)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onMouseEnter={() => audioEnabled && playHover()}
                              className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                                isSelected
                                  ? "bg-[#0ea5e9]/20 border border-[#0ea5e9]/50"
                                  : "bg-white/5 border border-white/10 hover:border-white/20"
                              }`}
                            >
                              <span className="text-xl">{feature.icon}</span>
                              <div className="flex-1">
                                <p className={`text-sm font-medium ${isSelected ? "text-[#0ea5e9]" : "text-white"}`}>
                                  {feature.id}
                                </p>
                                <p className="text-xs text-zinc-500">{feature.description}</p>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#0ea5e9]" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                      {config.features.length > 0 && (
                        <motion.button
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={handleFeaturesConfirm}
                          className="mt-3 w-full py-2.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          Continue ({config.features.length} selected)
                          <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tier Selection UI */}
              {step === "tier" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 max-w-[95%]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex-1">
                      <div className="grid grid-cols-1 gap-3">
                        {TIERS.map((tier) => (
                          <motion.button
                            key={tier.id}
                            onClick={() => handleTierSelect(tier.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onMouseEnter={() => audioEnabled && playHover()}
                            className={`p-4 rounded-xl text-left transition-all border ${
                              config.tier === tier.id
                                ? "bg-[#0ea5e9]/20 border-[#0ea5e9]/50"
                                : "bg-white/5 border-white/10 hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-white">{tier.name}</span>
                              <span className="text-lg font-bold text-[#0ea5e9]">${tier.price}<span className="text-sm text-zinc-500">/mo</span></span>
                            </div>
                            <p className="text-xs text-zinc-400 mb-3">{tier.description}</p>
                            <ul className="space-y-1">
                              {tier.features.map((feature, i) => (
                                <li key={i} className="text-xs text-zinc-500 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-green-500" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                <motion.span 
                  className="w-2 h-2 rounded-full bg-[#0ea5e9]"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
                <motion.span 
                  className="w-2 h-2 rounded-full bg-[#0ea5e9]"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
                />
                <motion.span 
                  className="w-2 h-2 rounded-full bg-[#0ea5e9]"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
                />
              </div>
            </motion.div>
          )}
          
          {isDeploying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-4 bg-[#0ea5e9]/10 rounded-xl border border-[#0ea5e9]/20"
            >
              <Loader2 className="w-5 h-5 text-[#0ea5e9] animate-spin" />
              <span className="text-sm text-zinc-300">Setting up your AI assistant...</span>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {(step === "name" || step === "purpose") && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border-t border-white/5"
          >
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => enableAudio()}
                placeholder={step === "name" ? "Name your assistant..." : "What do you need help with?"}
                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-zinc-600 h-12 rounded-xl focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-12 w-12 rounded-xl p-0 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 lg:left-auto lg:w-7/12 lg:left-[calc(41.666667%)] bg-[#0a0a0b]/80 backdrop-blur-md border-t border-white/5 py-2 px-4 z-40">
        <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            No data stored
          </span>
          <span>•</span>
          <span>Anonymous sessions</span>
          <span>•</span>
          <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">
            Dashboard
          </Link>
        </div>
      </footer>

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
