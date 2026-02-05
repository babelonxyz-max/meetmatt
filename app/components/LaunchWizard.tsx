"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Zap, Code, Globe, Database, ChevronRight, Loader2, Wallet, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AIOrb } from "./AIOrb";
import { PaymentModal } from "./PaymentModal";
import { getOrCreateSessionId, savePendingConfig, clearPendingConfig, getPendingConfig } from "@/lib/session";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: string[];
}

interface SetupConfig {
  agentName: string;
  purpose: string;
  features: string[];
}

// Single plan pricing
const PLAN_PRICE = 150;

export function LaunchWizard({ onClose }: { onClose: () => void }) {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [config, setConfig] = useState<SetupConfig>({
    agentName: "",
    purpose: "",
    features: [],
  });
  const [step, setStep] = useState<"name" | "purpose" | "features" | "confirm" | "deploying" | "success">("name");
  const [showPayment, setShowPayment] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session on mount
  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);

    // Check for pending config
    const pending = getPendingConfig();
    if (pending) {
      setConfig({
        agentName: pending.agentName,
        purpose: pending.purpose,
        features: pending.features,
      });
    }

    // Initial message
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Welcome to OpenClaw! 👋\n\nI'll help you deploy your AI agent in minutes. No signup needed - just pay with crypto and go!\n\nWhat would you like to name your agent?",
      },
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: "assistant" | "user", content: string, options?: string[]) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role, content, options }]);
  };

  const simulateTyping = async (content: string, options?: string[]) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 500));
    setIsTyping(false);
    addMessage("assistant", content, options);
  };

  const handleNameSubmit = async () => {
    if (!input.trim()) return;
    const name = input.trim();
    setConfig((prev) => ({ ...prev, agentName: name }));
    addMessage("user", name);
    setInput("");
    setStep("purpose");
    
    await simulateTyping(
      `Great! ${name} is a perfect name. 🎯\n\nNow, what would you like ${name} to help you with? Describe your project or main goal.`,
      ["Build a web app", "Data analysis", "Content creation", "Research", "Automation", "Something else..."]
    );
  };

  const handlePurposeSubmit = async () => {
    if (!input.trim()) return;
    const purpose = input.trim();
    setConfig((prev) => ({ ...prev, purpose }));
    addMessage("user", purpose);
    setInput("");
    setStep("features");

    await simulateTyping(
      "Excellent choice! ✨\n\nWhat capabilities should your agent have? Select all that apply:",
      ["Code Writing", "Web Browsing", "API Integration", "File Management", "Database Access", "Custom Tools"]
    );
  };

  const handleFeatureSelect = async (feature: string) => {
    setConfig((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleFeaturesConfirm = async () => {
    if (config.features.length === 0) return;
    addMessage("user", `Selected: ${config.features.join(", ")}`);
    setStep("confirm");

    await simulateTyping(
      `Ready to deploy **${config.agentName}**! 🚀\n\n🎯 ${config.purpose}\n⚡ ${config.features.join(", ")}\n\n💎 MATT Plan: $${PLAN_PRICE}/mo (unlimited everything)\n\nProceed to payment?`,
      ["Pay with Crypto", "Modify Setup"]
    );
  };

  const handleConfirm = (action: string) => {
    if (action === "Pay with Crypto") {
      // Save config to localStorage before payment
      savePendingConfig({
        agentName: config.agentName,
        purpose: config.purpose,
        features: config.features,
        createdAt: Date.now(),
      });
      setShowPayment(true);
    } else {
      setStep("name");
      setConfig({ agentName: "", purpose: "", features: [] });
      clearPendingConfig();
      setMessages([{
        id: "restart",
        role: "assistant",
        content: "Let's start fresh! What would you like to name your agent?",
      }]);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setIsDeploying(true);
    setStep("deploying");

    // Deploy the agent
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          sessionId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        clearPendingConfig();
        setStep("success");
        setMessages((prev) => [...prev, {
          id: "success",
          role: "assistant",
          content: `🎉 ${config.agentName} is LIVE!\n\nYour OpenClaw agent has been deployed and is ready to work. You can access it anytime from your browser.`,
          options: ["View Dashboard", "Open Devin", "Close"],
        }]);
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (error: any) {
      setMessages((prev) => [...prev, {
        id: "error",
        role: "assistant",
        content: `❌ Error: ${error.message}\n\nPlease try again or contact support.`,
        options: ["Try Again", "Close"],
      }]);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleAction = (action: string) => {
    if (action === "View Dashboard") {
      window.location.href = '/dashboard';
    } else if (action === "Open Devin") {
      window.open('https://app.devin.ai', '_blank');
    } else if (action === "Close" || action === "Try Again") {
      onClose();
    }
    // "Modify Setup" is handled in handleConfirm, not here
  };

  const handleSend = () => {
    if (!input.trim()) return;
    switch (step) {
      case "name":
        handleNameSubmit();
        break;
      case "purpose":
        handlePurposeSubmit();
        break;
      default:
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOptionClick = (option: string) => {
    if (step === "features") {
      handleFeatureSelect(option);
    } else if (step === "confirm") {
      handleConfirm(option);
    } else if (step === "success") {
      handleAction(option);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl h-[80vh] glass-strong rounded-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">OpenClaw</h3>
              <p className="text-xs text-zinc-400">No signup • Pay with crypto • Deploy instantly</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-white">
            Close
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index === messages.length - 1 ? 0 : 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    message.role === "user"
                      ? "bg-indigo-500 text-white"
                      : "bg-zinc-800/80 text-zinc-100 border border-white/5"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Options */}
                  {message.options && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.options.map((option) => {
                        const isSelected = config.features.includes(option);
                        const isPay = option === "Pay with Crypto";
                        const isDashboard = option === "View Dashboard" || option === "Open Devin";
                        
                        return (
                          <button
                            key={option}
                            onClick={() => handleOptionClick(option)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                              isSelected
                                ? "bg-indigo-500 text-white"
                                : isPay
                                ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white"
                                : isDashboard
                                ? "bg-indigo-500 text-white"
                                : step === "confirm" || step === "success"
                                ? "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 border border-white/10"
                                : "bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 border border-white/10"
                            }`}
                          >
                            {isPay && <Wallet className="w-3 h-3" />}
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Confirm Features Button */}
                  {step === "features" && config.features.length > 0 && (
                    <button
                      onClick={handleFeaturesConfirm}
                      className="mt-3 w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      Continue ({config.features.length} selected)
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-zinc-500 typing-dot" />
                <span className="w-2 h-2 rounded-full bg-zinc-500 typing-dot" />
                <span className="w-2 h-2 rounded-full bg-zinc-500 typing-dot" />
              </div>
            </motion.div>
          )}

          {isDeploying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
            >
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <span className="text-sm text-indigo-300">Deploying your agent...</span>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {(step === "name" || step === "purpose") && (
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={step === "name" ? "Enter agent name..." : "Describe your project..."}
                className="flex-1 bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

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
      </motion.div>
    </div>
  );
}
