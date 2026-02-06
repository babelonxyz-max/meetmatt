"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentModal } from "./components/PaymentModal";
import { AIOrb, type AIOrbProps } from "./components/AIOrb";
import { ThemeToggle } from "./components/ThemeToggle";
import { getOrCreateSessionId, savePendingConfig, clearPendingConfig } from "@/lib/session";
import { initAudio, playMessageSent, playMessageReceived, playOptionSelected, playSuccess } from "@/lib/audio";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: string[];
}

type Step = "intro" | "login" | "name" | "usecase" | "scope" | "contact" | "confirm" | "deploying" | "activating" | "awaiting_verification" | "success";

interface SetupConfig {
  agentName: string;
  useCase: string;
  scope: string;
  contactMethod: string;
}

interface AgentData {
  id: string;
  activationStatus: string;
  botUsername?: string;
  telegramLink?: string;
  authCode?: string;
}

const USE_CASE_OPTIONS = [
  { id: "assistant", label: "AI Assistant", icon: "🤖", desc: "Personal helper for daily tasks" },
  { id: "coworker", label: "Coworker", icon: "👥", desc: "Team member for collaboration" },
  { id: "employee", label: "Digital Employee", icon: "💼", desc: "Autonomous worker for your business" },
];

const SCOPE_OPTIONS: Record<string, { id: string; label: string; icon: string }[]> = {
  assistant: [
    { id: "scheduling", label: "Schedule management", icon: "📅" },
    { id: "email", label: "Email handling", icon: "📧" },
    { id: "research", label: "Research & summaries", icon: "🔍" },
    { id: "writing", label: "Writing & editing", icon: "✍️" },
    { id: "reminders", label: "Reminders & tasks", icon: "⏰" },
  ],
  coworker: [
    { id: "brainstorm", label: "Brainstorming", icon: "💡" },
    { id: "documents", label: "Document collaboration", icon: "📄" },
    { id: "meetings", label: "Meeting notes", icon: "📝" },
    { id: "planning", label: "Project planning", icon: "🎯" },
    { id: "analysis", label: "Data analysis", icon: "📊" },
  ],
  employee: [
    { id: "customers", label: "Customer support", icon: "🎧" },
    { id: "leads", label: "Lead generation", icon: "🎯" },
    { id: "content", label: "Content creation", icon: "📱" },
    { id: "sales", label: "Sales outreach", icon: "💰" },
    { id: "operations", label: "Operations", icon: "⚙️" },
  ],
};

const CONTACT_OPTIONS = [
  { id: "telegram", label: "Telegram", icon: "✈️", available: true },
  { id: "whatsapp", label: "WhatsApp", icon: "💬", available: false },
  { id: "slack", label: "Slack", icon: "💻", available: false },
];

export default function Home() {
  const { authenticated, login, user, logout } = usePrivy();
  const [sessionId] = useState<string>(() => getOrCreateSessionId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<SetupConfig>({
    agentName: "",
    useCase: "",
    scope: "",
    contactMethod: "",
  });
  const [step, setStep] = useState<Step>("intro");
  const [showPayment, setShowPayment] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [currentAgent, setCurrentAgent] = useState<AgentData | null>(null);
  const [awaitingAuthCode, setAwaitingAuthCode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activationPollRef = useRef<NodeJS.Timeout | null>(null);

  const getWizardState = (): AIOrbProps["wizardState"] => {
    if (step === "intro") return "idle";
    if (step === "name" || step === "login") return "initializing";
    if (step === "usecase" || step === "scope" || step === "contact") return "processing";
    if (step === "deploying" || step === "activating") return "deploying";
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
      
      // Check if user just logged in with pending config
      const { getPendingConfig } = require("@/lib/session");
      const pending = getPendingConfig();
      
      if (authenticated && pending && pending.agentName) {
        // Restore the config and continue to contact step
        setConfig({
          agentName: pending.agentName,
          useCase: pending.useCase,
          scope: pending.scope,
          contactMethod: "",
        });
        setMessages([
          {
            id: "welcome-back",
            role: "assistant",
            content: `Welcome back! Let's continue setting up **${pending.agentName}**.`,
          },
          {
            id: "contact-method",
            role: "assistant",
            content: "How would you like to contact your agent?",
            options: CONTACT_OPTIONS.map((o) => `${o.icon} ${o.label}${o.available ? "" : " (soon)"}`),
          },
        ]);
        setStep("contact");
      } else {
        // Initial welcome with big greeting bubble
        setStep("intro");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [authenticated]);

  useEffect(() => {
    if ((step === "name" || step === "scope" || step === "awaiting_verification") && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [step]);

  // Poll for activation status
  useEffect(() => {
    if (step === "activating" && currentAgent?.id) {
      activationPollRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/agents?id=${currentAgent.id}`);
          if (response.ok) {
            const agent = await response.json();
            if (agent.activationStatus === "awaiting_verification") {
              setCurrentAgent(agent);
              setStep("awaiting_verification");
              addMessage("assistant", `🎉 Your bot **@${agent.botUsername}** is ready!\n\n👉 [Click here to open Telegram](${agent.telegramLink})\n\n**Please message the bot now.** It will give you an auth code. Paste that code here:`, []);
              setAwaitingAuthCode(true);
              if (activationPollRef.current) clearInterval(activationPollRef.current);
            } else if (agent.activationStatus === "active") {
              setCurrentAgent(agent);
              setStep("success");
              addMessage("assistant", `✅ **${config.agentName}** is now active and ready to help you!\n\nYou can chat with your bot anytime at **@${agent.botUsername}**`, ["Create another"]);
              if (activationPollRef.current) clearInterval(activationPollRef.current);
            } else if (agent.activationStatus === "failed") {
              addMessage("assistant", "❌ Activation failed. Please contact support.", ["Try again"]);
              if (activationPollRef.current) clearInterval(activationPollRef.current);
            }
          }
        } catch (err) {
          console.error("Poll error:", err);
        }
      }, 5000);
    }
    return () => {
      if (activationPollRef.current) clearInterval(activationPollRef.current);
    };
  }, [step, currentAgent?.id]);

  const addMessage = (role: "assistant" | "user", content: string, options?: string[]) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role, content, options }]);
    if (role === "assistant" && audioEnabled) playMessageReceived();
  };

  const simulateTyping = async (content: string, options?: string[]) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 300));
    setIsTyping(false);
    addMessage("assistant", content, options);
  };

  const handleBack = async () => {
    await enableAudio();
    const stepOrder: Step[] = ["intro", "login", "name", "usecase", "scope", "contact", "confirm"];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1];
      setStep(prevStep);
      setMessages((prev) => {
        const newMessages = [...prev];
        while (newMessages.length > 0 && (newMessages[newMessages.length - 1].role === "user" || newMessages[newMessages.length - 1].options)) {
          newMessages.pop();
        }
        return newMessages;
      });
    }
  };

  const startCreating = async () => {
    await enableAudio();
    playOptionSelected();
    setStep("name");
    setTimeout(() => {
      simulateTyping("What should be the name of your agent?");
    }, 400);
  };

  const handleLogin = async () => {
    await enableAudio();
    playOptionSelected();
    // Save current config before login so we can restore after
    savePendingConfig({ ...config, createdAt: Date.now() });
    login();
  };

  const handleNameSubmit = async () => {
    if (!input.trim()) return;
    await enableAudio();
    playMessageSent();
    const name = input.trim();
    setConfig((prev) => ({ ...prev, agentName: name }));
    addMessage("user", name);
    setInput("");
    setStep("usecase");
    await simulateTyping(
      `Nice to meet ${name}! What's the use case for ${name}?`,
      USE_CASE_OPTIONS.map((o) => `${o.icon} ${o.label}`)
    );
  };

  const handleUseCaseSelect = async (option: string) => {
    await enableAudio();
    playOptionSelected();
    const useCaseId = USE_CASE_OPTIONS.find((o) => option.includes(o.label))?.id || "";
    setConfig((prev) => ({ ...prev, useCase: useCaseId }));
    addMessage("user", option.replace(/^\S+\s/, ""));
    setStep("scope");
    const scopeOptions = SCOPE_OPTIONS[useCaseId] || [];
    await simulateTyping(
      "What should your agent help with? Select all that apply:",
      scopeOptions.map((o) => `${o.icon} ${o.label}`)
    );
  };

  const handleScopeToggle = async (option: string) => {
    await enableAudio();
    const scopeLabel = option.replace(/^\S+\s/, "");
    const newScopes = selectedScopes.includes(scopeLabel) 
      ? selectedScopes.filter((s) => s !== scopeLabel) 
      : [...selectedScopes, scopeLabel];
    setSelectedScopes(newScopes);
    
    setMessages((prev) => {
      const newMessages = [...prev];
      const lastIdx = newMessages.length - 1;
      if (newMessages[lastIdx]?.role === "user" && newMessages[lastIdx]?.id.startsWith("selection-")) {
        newMessages.pop();
      }
      if (newScopes.length > 0) {
        newMessages.push({
          id: `selection-${Date.now()}`,
          role: "user",
          content: newScopes.join(", "),
        });
      }
      return newMessages;
    });
  };

  const handleScopeConfirm = async () => {
    if (selectedScopes.length === 0) return;
    await enableAudio();
    playOptionSelected();
    const scopeString = selectedScopes.join(", ");
    setConfig((prev) => ({ ...prev, scope: scopeString }));
    setMessages((prev) => {
      const newMessages = [...prev];
      const lastIdx = newMessages.length - 1;
      if (newMessages[lastIdx]?.role === "user" && newMessages[lastIdx]?.id.startsWith("selection-")) {
        newMessages[lastIdx] = {
          id: `confirm-${Date.now()}`,
          role: "user",
          content: scopeString,
        };
      } else {
        newMessages.push({
          id: `confirm-${Date.now()}`,
          role: "user",
          content: scopeString,
        });
      }
      return newMessages;
    });
    setSelectedScopes([]);
    
    // Check if user is logged in AFTER they've invested effort (name + usecase + scope)
    if (!authenticated) {
      setStep("login");
      await simulateTyping(
        `Great choices! To proceed with creating **${config.agentName}**, please log in. This helps us save your agent and keep track of your deployment.`,
        ["Log in"]
      );
      return;
    }
    
    setStep("contact");
    await simulateTyping(
      "How would you like to contact your agent?",
      CONTACT_OPTIONS.map((o) => `${o.icon} ${o.label}${o.available ? "" : " (soon)"}`)
    );
  };

  const handleContactSelect = async (option: string) => {
    await enableAudio();
    playOptionSelected();
    const contactId = option.replace(/^\S+\s/, "").replace(" (soon)", "").toLowerCase();
    if (contactId !== "telegram") {
      await simulateTyping("This option will be available soon. Please select Telegram for now.");
      return;
    }
    setConfig((prev) => ({ ...prev, contactMethod: contactId }));
    addMessage("user", "Telegram");
    setStep("confirm");
    await simulateTyping(
      `Ready to deploy **${config.agentName}**! 🚀\n\nUse case: ${USE_CASE_OPTIONS.find((u) => u.id === config.useCase)?.label}\nScope: ${config.scope}${selectedScopes.length > 0 ? `, ${selectedScopes.join(", ")}` : ""}\nContact: Telegram`,
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
    addMessage("assistant", "💳 Payment confirmed! Initializing deployment...", []);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, sessionId, userId: user?.id }),
      });

      if (!response.ok) throw new Error("Deployment failed");

      const agent = await response.json();
      setCurrentAgent(agent);
      clearPendingConfig();
      setIsDeploying(false);
      setStep("activating");
      addMessage("assistant", "⏳ Payment received! Your agent is being activated. This may take a few minutes...", []);
    } catch (error: any) {
      setIsDeploying(false);
      setStep("confirm");
      addMessage("assistant", `Error: ${error.message}. Retry?`, ["Retry deployment"]);
    }
  };

  const handleAuthCodeSubmit = async (code: string) => {
    if (!currentAgent?.id) return;
    
    addMessage("user", code);
    setInput("");
    
    try {
      // Send auth code to verification endpoint
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: currentAgent.id,
          code: code,
          telegramUserId: user?.id,
        }),
      });

      if (response.ok) {
        setAwaitingAuthCode(false);
        setStep("success");
        addMessage("assistant", `✅ **${config.agentName}** is now active and you're the admin!\n\nYou can chat with your bot anytime at **@${currentAgent.botUsername}**`, ["Create another"]);
      } else {
        addMessage("assistant", "❌ Invalid auth code. Please try again:", []);
      }
    } catch (err) {
      addMessage("assistant", "❌ Error verifying code. Please try again:", []);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (step === "name") handleNameSubmit();
    else if (step === "awaiting_verification" && awaitingAuthCode) {
      handleAuthCodeSubmit(input.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOptionClick = async (option: string) => {
    await enableAudio();
    if (option === "Start creating") {
      startCreating();
    } else if (option === "Log in") {
      handleLogin();
    } else if (step === "usecase") {
      handleUseCaseSelect(option);
    } else if (step === "scope") {
      handleScopeToggle(option);
    } else if (step === "contact") {
      handleContactSelect(option);
    } else if (step === "confirm" || step === "success") {
      if (option === "Create another") {
        setStep("intro");
        setConfig({ agentName: "", useCase: "", scope: "", contactMethod: "" });
        setSelectedScopes([]);
        setCurrentAgent(null);
        setAwaitingAuthCode(false);
        setMessages([]);
      } else {
        handleConfirm(option);
      }
    }
  };

  // Only show back button when NOT on intro step
  const canGoBack = step !== "intro" && step !== "confirm" && !isDeploying && step !== "success" && step !== "activating" && step !== "awaiting_verification";

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[var(--background)] flex items-center justify-center safe-area-padding">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-[var(--muted)] font-mono text-sm">
          Initializing...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[var(--background)] overflow-hidden flex flex-col">
      {/* Header - Always visible with login/pricing buttons */}
      <header className="flex-none h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          </motion.div>
          <span className="font-semibold text-lg tracking-tight">Matt</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="gap-1">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Pricing</span>
            </Button>
          </Link>
          <ThemeToggle />
          {authenticated ? (
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/dashboard"}>
              Dashboard
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={login} className="gap-1">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Log in</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content - Flex column with proper height distribution */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {/* Back Button - Only shown when canGoBack is true */}
        {canGoBack && (
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 z-40 p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors bg-[var(--background)]/50 rounded-lg backdrop-blur-sm"
          >
            ← Back
          </button>
        )}

        {/* Orb Section - Takes available space */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0">
          <div className="w-44 h-44 sm:w-52 sm:h-52 lg:w-60 lg:h-60">
            <AIOrb wizardState={getWizardState()} showGreeting={step === "intro"} />
          </div>
        </div>

        {/* Messages Section - Fixed max height, scrollable */}
        <div className="flex-none px-4 pb-4 max-h-[35vh] overflow-y-auto scrollbar-hide">
          <div className="w-full max-w-md mx-auto space-y-3">
            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] ${msg.role === "user" ? "bg-[var(--accent)] text-white" : "bg-[var(--card)] border border-[var(--border)]"} rounded-2xl px-4 py-3`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
                    
                    {/* Options */}
                    {msg.options && msg.options.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleOptionClick(opt)}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs font-medium transition-colors border border-white/20"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <span className="w-2 h-2 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Big Welcome Message Bubble - Only on intro */}
        {step === "intro" && messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-none px-4 pb-6"
          >
            <div className="max-w-md mx-auto bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
              <h1 className="text-xl font-bold mb-3 text-center">
                Meet Your AI Agent
              </h1>
              <p className="text-[var(--muted)] text-sm text-center mb-4 leading-relaxed">
                I&apos;m <strong>MATT</strong> — your AI deployment assistant. I&apos;ll help you create a custom Telegram bot powered by Kimi K2.5 in just a few minutes.
              </p>
              <div className="flex flex-col gap-2 text-xs text-[var(--muted)] mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">1</span>
                  <span>Name your agent & choose its role</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">2</span>
                  <span>Select capabilities & contact method</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">3</span>
                  <span>Pay with crypto & deploy instantly</span>
                </div>
              </div>
              <button
                onClick={() => handleOptionClick("Start creating")}
                className="w-full py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Start Creating
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Input Area - Fixed at bottom when needed */}
        {(step === "name" || step === "awaiting_verification") && (
          <div className="flex-none border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 pb-safe">
            <div className="max-w-md mx-auto flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={step === "awaiting_verification" ? "Enter auth code from bot..." : "Type your agent's name..."}
                className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-11 h-11 bg-[var(--accent)] text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        config={config}
        sessionId={sessionId}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
