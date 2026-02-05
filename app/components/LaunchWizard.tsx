"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function LaunchWizard({ onClose }: { onClose: () => void }) {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [config, setConfig] = useState<SetupConfig>({
    agentName: "",
    useCase: "",
    scope: "",
    contactMethod: "",
  });
  const [step, setStep] = useState<"name" | "usecase" | "scope" | "contact" | "confirm" | "deploying" | "success">("name");
  const [showPayment, setShowPayment] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);

    const pending = getPendingConfig();
    if (pending) {
      setConfig({
        agentName: pending.agentName,
        useCase: pending.useCase,
        scope: pending.scope,
        contactMethod: pending.contactMethod,
      });
    }

    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Welcome! I'm MATT. I'll help you create your AI agent in minutes. Let's start with a name.",
    }]);
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
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsTyping(false);
    addMessage("assistant", content, options);
  };

  const handleNameSubmit = async () => {
    if (!input.trim()) return;
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

  const handleScopeToggle = (option: string) => {
    const scopeLabel = option.replace(/^\S+\s/, "");
    setSelectedScopes((prev) =>
      prev.includes(scopeLabel) ? prev.filter((s) => s !== scopeLabel) : [...prev, scopeLabel]
    );
  };

  const handleScopeConfirm = async () => {
    if (selectedScopes.length === 0) return;
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
    const contactId = option.replace(/^\S+\s/, "").replace(" (soon)", "").toLowerCase();
    if (contactId !== "telegram") {
      await simulateTyping("This option will be available soon. Please select Telegram for now.");
      return;
    }
    setConfig((prev) => ({ ...prev, contactMethod: contactId }));
    addMessage("user", "Telegram");
    setStep("confirm");
    await simulateTyping(
      `Ready to deploy **${config.agentName}**! 🚀`,
      ["Proceed to payment"]
    );
  };

  const handleConfirm = (action: string) => {
    if (action === "Proceed to payment") {
      savePendingConfig({ ...config, createdAt: Date.now() });
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setIsDeploying(true);
    setStep("deploying");

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
      setMessages((prev) => [
        ...prev,
        {
          id: "success",
          role: "assistant",
          content: `🎉 ${config.agentName} is now live! Check your Telegram.`,
          options: ["Create another"],
        },
      ]);
    } catch (error: any) {
      setIsDeploying(false);
      setStep("confirm");
      setMessages((prev) => [...prev, { id: "error", role: "assistant", content: `Error: ${error.message}` }]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

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
              <span className="text-white text-sm">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">MATT</h3>
              <p className="text-xs text-zinc-400">AI Agent Deployment</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-indigo-500 text-white" : "bg-zinc-800/80 text-zinc-100 border border-white/5"}`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.options && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.options.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          if (step === "usecase") handleUseCaseSelect(option);
                          else if (step === "scope") handleScopeToggle(option);
                          else if (step === "contact") handleContactSelect(option);
                          else if (step === "confirm") handleConfirm(option);
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-700/50 text-zinc-300 hover:bg-indigo-500/50 hover:text-white border border-white/10 transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-500 typing-dot" />
              <div className="w-2 h-2 rounded-full bg-zinc-500 typing-dot" />
              <div className="w-2 h-2 rounded-full bg-zinc-500 typing-dot" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <AnimatePresence mode="wait">
          {step === "name" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                  placeholder="Agent name..."
                  className="flex-1 bg-zinc-800/50 border-white/10 text-white"
                />
                <Button onClick={handleNameSubmit} disabled={!input.trim()} className="bg-indigo-500 hover:bg-indigo-600 text-white">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === "scope" && selectedScopes.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-4 border-t border-white/10">
              <Button onClick={handleScopeConfirm} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white">
                Continue ({selectedScopes.length}) <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {showPayment && <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} config={config} sessionId={sessionId} onSuccess={handlePaymentSuccess} />}
      </motion.div>
    </div>
  );
}
