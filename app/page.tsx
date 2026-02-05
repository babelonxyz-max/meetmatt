"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentModal } from "./components/PaymentModal";
import { AIOrb, type AIOrbProps } from "./components/AIOrb";
import { JarvisInterface } from "./components/JarvisInterface";
import { ThemeToggle } from "./components/ThemeToggle";
import { getOrCreateSessionId, savePendingConfig, clearPendingConfig } from "@/lib/session";
import { initAudio, playMessageSent, playMessageReceived, playOptionSelected, playSuccess } from "@/lib/audio";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: string[];
}

type Step = "intro" | "name" | "usecase" | "scope" | "contact" | "confirm" | "deploying" | "success";

interface SetupConfig {
  agentName: string;
  useCase: string;
  scope: string;
  contactMethod: string;
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
  const inputRef = useRef<HTMLInputElement>(null);

  const getWizardState = (): AIOrbProps["wizardState"] => {
    if (step === "intro") return "idle";
    if (step === "name") return "initializing";
    if (step === "usecase" || step === "scope" || step === "contact") return "processing";
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
        content: "Hello! I'm MATT. I'll help you create your AI agent in minutes. Ready to get started?",
        options: ["Start creating"],
      }]);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ((step === "name" || step === "scope") && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [step]);

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
    const stepOrder: Step[] = ["intro", "name", "usecase", "scope", "contact", "confirm"];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1];
      setStep(prevStep);
      // Remove last user and assistant messages
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

  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  const handleScopeToggle = async (option: string) => {
    await enableAudio();
    const scopeLabel = option.replace(/^\S+\s/, "");
    setSelectedScopes((prev) =>
      prev.includes(scopeLabel) ? prev.filter((s) => s !== scopeLabel) : [...prev, scopeLabel]
    );
  };

  const handleScopeConfirm = async () => {
    if (selectedScopes.length === 0) return;
    await enableAudio();
    playOptionSelected();
    setConfig((prev) => ({ ...prev, scope: selectedScopes.join(", ") }));
    addMessage("user", selectedScopes.join(", "));
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
    addMessage("assistant", "Initializing deployment...", []);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, sessionId }),
      });

      if (!response.ok) throw new Error("Deployment failed");

      clearPendingConfig();
      setIsDeploying(false);
      setStep("success");
      addMessage("assistant", `🎉 ${config.agentName} is now live! Check your Telegram.`, ["Create another"]);
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
    if (option === "Start creating") {
      startCreating();
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
        setMessages([{
          id: "restart",
          role: "assistant",
          content: "Hello! I'm MATT. I'll help you create your AI agent in minutes. Ready to get started?",
          options: ["Start creating"],
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
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-[var(--muted)] font-mono text-sm">
          Initializing...
        </motion.div>
      </div>
    );
  }

  return (
    <main className="fixed inset-0 pt-14 pb-safe bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex flex-col lg:flex-row">
      {/* Left Side - AI Orb */}
      <div className="lg:w-[42%] h-[35%] lg:h-full flex flex-col items-center justify-center relative">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 lg:w-56 lg:h-56">
          <AIOrb isListening={isTyping} isThinking={isDeploying} intensity={isDeploying ? "high" : "medium"} wizardState={getWizardState()} />
        </motion.div>

        <motion.div className="mt-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h1 className="text-xl lg:text-2xl font-semibold mb-1 tracking-wider">MATT</h1>
          <p className="text-[10px] lg:text-xs font-mono text-[var(--muted)]">{isTyping ? "PROCESSING..." : isDeploying ? "DEPLOYING..." : "SYSTEM READY"}</p>
        </motion.div>

        <div className="absolute bottom-4 left-4 z-20">
          <ThemeToggle />
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="lg:w-[58%] h-[65%] lg:h-full flex flex-col bg-gradient-to-l from-[var(--card)]/20 to-transparent">
        <JarvisInterface messages={messages} isTyping={isTyping} isDeploying={isDeploying} canGoBack={canGoBack} onBack={handleBack} onOptionClick={handleOptionClick}>
          <AnimatePresence mode="wait">
            {/* NAME INPUT */}
            {step === "name" && (
              <motion.div key="name-step" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-4 border-t border-[var(--border)]">
                <div className="max-w-md mx-auto">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => enableAudio()}
                    placeholder="e.g., Jarvis, Maya, Helper..."
                    className="flex-1 bg-[var(--card)] border-[var(--border)] h-12 text-base mb-3"
                  />
                  <Button onClick={handleNameSubmit} disabled={!input.trim()} className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-11 disabled:opacity-50">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* USE CASE SELECTION */}
            {step === "usecase" && (
              <motion.div key="usecase-step" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-4 border-t border-[var(--border)]">
                <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
                  {USE_CASE_OPTIONS.map((option) => (
                    <motion.button
                      key={option.id}
                      onClick={() => handleUseCaseSelect(`${option.icon} ${option.label}`)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[#0ea5e9]/50 text-left transition-all"
                    >
                      <span className="text-2xl">{option.icon}</span>
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-[var(--muted)]">{option.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SCOPE MULTI-SELECT */}
            {step === "scope" && (
              <motion.div key="scope-step" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-4 border-t border-[var(--border)]">
                <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto mb-3">
                  {(SCOPE_OPTIONS[config.useCase] || []).map((option) => {
                    const isSelected = selectedScopes.includes(option.label);
                    return (
                      <motion.button
                        key={option.id}
                        onClick={() => handleScopeToggle(`${option.icon} ${option.label}`)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-full border text-sm transition-all flex items-center gap-2 ${
                          isSelected ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]" : "bg-[var(--card)] border-[var(--border)] hover:border-[#0ea5e9]/50"
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </motion.button>
                    );
                  })}
                </div>
                {selectedScopes.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                    <Button onClick={handleScopeConfirm} className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-6">
                      Continue ({selectedScopes.length}) <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* CONTACT METHOD */}
            {step === "contact" && (
              <motion.div key="contact-step" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-4 border-t border-[var(--border)]">
                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                  {CONTACT_OPTIONS.map((option) => (
                    <motion.button
                      key={option.id}
                      onClick={() => handleContactSelect(`${option.icon} ${option.label}`)}
                      whileHover={{ scale: option.available ? 1.05 : 1 }}
                      whileTap={{ scale: option.available ? 0.95 : 1 }}
                      disabled={!option.available}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        option.available
                          ? "bg-[var(--card)] border-[var(--border)] hover:border-[#0ea5e9]/50 cursor-pointer"
                          : "bg-[var(--card)]/50 border-[var(--border)]/50 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span className="text-2xl">{option.icon}</span>
                      <span className="text-sm font-medium">{option.label}</span>
                      {!option.available && <span className="text-[10px] text-[var(--muted)]">Soon</span>}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </JarvisInterface>
      </div>

      {showPayment && <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} config={config} sessionId={sessionId} onSuccess={handlePaymentSuccess} />}
    </main>
  );
}
