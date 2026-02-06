"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, User } from "lucide-react";
import { PaymentModal } from "./components/PaymentModal";
import { AIOrb, type AIOrbProps } from "./components/AIOrb";
import { ThemeToggle } from "./components/ThemeToggle";
import { getOrCreateSessionId, savePendingConfig, clearPendingConfig, getPendingConfig } from "@/lib/session";
import { initAudio, playMessageSent, playMessageReceived, playOptionSelected, playSuccess } from "@/lib/audio";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: string[];
}

type Step = "intro" | "name" | "login" | "usecase" | "scope" | "contact" | "confirm" | "deploying" | "activating" | "awaiting_verification" | "success";

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

// Fun responses when clicking Matt
const ORB_CLICK_RESPONSES = [
  "Hey! I'm here to help! 👋",
  "Ready to create something amazing? ✨",
  "Click me all you want, I don't mind! 😄",
  "Your future AI agent awaits! 🤖",
  "Let's build something cool together! 🚀",
  "I'm listening... 👂",
  "Matt at your service! 💪",
  "Want to deploy an agent? Let's go! ⚡",
];

export default function Home() {
  const { authenticated, login, user, ready } = usePrivy();
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
  const [showContinue, setShowContinue] = useState(false);
  const [orbMessage, setOrbMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activationPollRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (ready && authenticated && step === "login") {
      const pending = getPendingConfig();
      if (pending && pending.agentName) {
        setConfig({
          agentName: pending.agentName,
          useCase: pending.useCase || "",
          scope: pending.scope || "",
          contactMethod: "",
        });
        setStep("usecase");
        setMessages((prev) => [
          ...prev,
          { id: "logged-in", role: "assistant", content: `✅ Logged in! Welcome back.`, options: [] }
        ]);
        setTimeout(() => {
          simulateTyping(
            `What's the use case for ${pending.agentName}?`,
            USE_CASE_OPTIONS.map((o) => `${o.icon} ${o.label}`)
          );
        }, 800);
      }
    }
  }, [ready, authenticated, step]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ((step === "name" || step === "awaiting_verification") && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [step]);

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

  // Clear orb message after 3 seconds
  useEffect(() => {
    if (orbMessage) {
      const timer = setTimeout(() => setOrbMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [orbMessage]);

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

  const handleOrbClick = useCallback(() => {
    const randomResponse = ORB_CLICK_RESPONSES[Math.floor(Math.random() * ORB_CLICK_RESPONSES.length)];
    setOrbMessage(randomResponse);
  }, []);

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
    
    if (!authenticated) {
      setStep("login");
      await simulateTyping(
        `Nice to meet **${name}**! To proceed with creating your agent, please log in.`,
        ["Log in"]
      );
      savePendingConfig({ agentName: name, useCase: "", scope: "", contactMethod: "", createdAt: Date.now() });
      return;
    }
    
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
    setSelectedScopes([]);
    setShowContinue(false);
    const scopeOptions = SCOPE_OPTIONS[useCaseId] || [];
    await simulateTyping(
      "What should your agent help with? Select all that apply:",
      scopeOptions.map((o) => `${o.icon} ${o.label}`)
    );
    setTimeout(() => setShowContinue(true), 500);
  };

  const handleScopeToggle = async (option: string) => {
    await enableAudio();
    const scopeLabel = option.replace(/^\S+\s/, "");
    
    const newScopes = selectedScopes.includes(scopeLabel) 
      ? selectedScopes.filter((s) => s !== scopeLabel) 
      : [...selectedScopes, scopeLabel];
    setSelectedScopes(newScopes);
  };

  const handleContinue = async () => {
    if (selectedScopes.length === 0) return;
    await enableAudio();
    playOptionSelected();
    const scopeString = selectedScopes.join(", ");
    setConfig((prev) => ({ ...prev, scope: scopeString }));
    setShowContinue(false);
    // Only add ONE message with the final selection
    addMessage("user", scopeString);
    setSelectedScopes([]);
    
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

  const canGoBack = step !== "intro" && step !== "name" && step !== "login" && step !== "confirm" && !isDeploying && step !== "success" && step !== "activating" && step !== "awaiting_verification";

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-[var(--muted)] font-mono text-lg">
          Initializing...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Single Header - Always visible with highest z-index */}
      <header className="flex-none h-16 sm:h-20 flex items-center justify-between px-6 sm:px-8 bg-[var(--background)] z-[100]">
        <div className="flex items-center gap-3">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
            <Sparkles className="w-7 h-7 text-[var(--accent)]" />
          </motion.div>
          <span className="font-bold text-2xl tracking-tight">Matt</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-lg text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
            Pricing
          </Link>
          <ThemeToggle />
          {authenticated ? (
            <Link href="/dashboard" className="text-lg text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
              Dashboard
            </Link>
          ) : (
            <button 
              onClick={login} 
              className="flex items-center gap-2 text-lg text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
            >
              <User className="w-5 h-5" />
              <span>Log in</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content - No scroll */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {/* Back Button */}
        {canGoBack && (
          <button
            onClick={() => {
              if (step === "usecase") setStep("name");
              else if (step === "scope") setStep("usecase");
              else if (step === "contact") setStep("scope");
              else setStep("intro");
            }}
            className="absolute top-4 left-4 z-40 px-4 py-2 text-base text-[var(--muted)] hover:text-[var(--foreground)] transition-colors bg-[var(--card)]/80 rounded-lg backdrop-blur-sm border border-[var(--border)] shadow-sm"
          >
            ← Back
          </button>
        )}

        {/* Messages Section */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto scrollbar-hide px-6 pt-4 pb-32">
            <div className="w-full max-w-2xl mx-auto space-y-4">
              <AnimatePresence mode="popLayout">
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div 
                      className={`
                        max-w-[85%]
                        ${msg.role === "user" 
                          ? "bg-[var(--accent)] text-white rounded-2xl rounded-br-md" 
                          : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-2xl rounded-bl-md"
                        } 
                        px-5 py-4 shadow-sm
                      `}
                    >
                      <p 
                        className="text-base leading-relaxed whitespace-pre-wrap" 
                        dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} 
                      />
                      
                      {msg.options && msg.options.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ staggerChildren: 0.05, delayChildren: 0.1 }}
                          className="flex flex-wrap gap-2 mt-3"
                        >
                          {msg.options.map((opt, idx) => (
                            <motion.button
                              key={opt}
                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ delay: idx * 0.08, duration: 0.3, ease: "easeOut" }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleOptionClick(opt)}
                              className={`px-4 py-2 text-base font-medium rounded-full transition-colors ${
                                step === "scope" && selectedScopes.includes(opt.replace(/^\S+\s/, ""))
                                  ? "bg-[var(--accent)] text-white"
                                  : "bg-white/10 hover:bg-white/20 border border-white/20"
                              }`}
                            >
                              {opt}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl rounded-bl-md px-5 py-4">
                    <div className="flex gap-1">
                      <span className="w-2.5 h-2.5 bg-[var(--muted)] rounded-full animate-bounce" />
                      <span className="w-2.5 h-2.5 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <span className="w-2.5 h-2.5 bg-[var(--muted)] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Orb Section with Click Message */}
        <div className="flex-none flex flex-col items-center justify-center py-2 relative">
          {/* Orb Click Message */}
          <AnimatePresence>
            {orbMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className="absolute -top-12 z-10"
              >
                <div className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-full text-sm text-[var(--foreground)] shadow-lg whitespace-nowrap">
                  {orbMessage}
                </div>
                <div className="flex justify-center">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[var(--border)]" />
                </div>
                <div className="flex justify-center -mt-[5px]">
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[var(--card)]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The Orb */}
          <div className="w-48 h-48 sm:w-56 sm:h-56" onClick={handleOrbClick}>
            <AIOrb wizardState={getWizardState()} />
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex-none px-6 pb-6 pt-2">
          {step === "intro" && messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-center">
                  Deploy Your AI Agent in Minutes
                </h1>
                <p className="text-[var(--muted)] text-base text-center mb-4 leading-relaxed">
                  I&apos;m <strong>MATT</strong> — your AI deployment assistant. I&apos;ll help you create a custom Telegram bot powered by Kimi K2.5.
                </p>
                <div className="flex flex-col gap-2 text-base text-[var(--muted)] mb-4">
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--background)]/50">
                    <span className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-sm">1</span>
                    <span>Name your agent & choose its role</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--background)]/50">
                    <span className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-sm">2</span>
                    <span>Select capabilities & contact method</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--background)]/50">
                    <span className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] font-bold text-sm">3</span>
                    <span>Pay with crypto & deploy instantly</span>
                  </div>
                </div>
                <button
                  onClick={() => handleOptionClick("Start creating")}
                  className="w-full py-4 bg-[var(--accent)] text-white rounded-xl font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  Start Creating
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ) : step === "name" || step === "awaiting_verification" ? (
            <div className="max-w-xl mx-auto">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={step === "awaiting_verification" ? "Enter auth code from bot..." : "Type your agent's name..."}
                  className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-4 text-base focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="w-14 h-14 bg-[var(--accent)] text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all hover:scale-105 active:scale-95"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          ) : step === "scope" && showContinue ? (
            <div className="max-w-xl mx-auto">
              <button
                onClick={handleContinue}
                disabled={selectedScopes.length === 0}
                className="w-full py-4 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              {selectedScopes.length === 0 && (
                <p className="text-center text-sm text-[var(--muted)] mt-2">Select at least one capability to continue</p>
              )}
            </div>
          ) : null}
        </div>
      </main>

      {/* Payment Modal - with z-index below header */}
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
