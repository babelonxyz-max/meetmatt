"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Check, ArrowRight, ExternalLink, FileText, Shield, Sparkles, User, Briefcase, Users, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentModal } from "./components/PaymentModal";
import AIOrb from "./components/AIOrb";
import { JarvisInterface } from "./components/JarvisInterface";
import { ThemeToggle } from "./components/ThemeToggle";
import { getOrCreateSessionId, savePendingConfig, clearPendingConfig } from "@/lib/session";
import { 
  initAudio, 
  playMessageSent, 
  playMessageReceived, 
  playOptionSelected, 
  playSuccess,
  playTyping 
} from "@/lib/audio";
import Link from "next/link";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: string[];
}

type Step = "intro" | "name" | "type" | "purpose" | "features" | "confirm";

interface SetupConfig {
  agentName: string;
  agentType: string;
  purpose: string;
  features: string[];
}

// Agent type suggestions with icons
const AGENT_TYPES = [
  { id: "Personal AI Assistant", icon: Bot, description: "Your own Jarvis - handles tasks, answers questions, manages your life" },
  { id: "Digital Twin", icon: User, description: "AI version of you - writes, speaks, and thinks like you" },
  { id: "Coworker", icon: Users, description: "Team member that never sleeps - collaborates on projects" },
  { id: "Employee", icon: Briefcase, description: "Full-time AI worker for specific business functions" },
  { id: "Custom", icon: Sparkles, description: "Something completely unique - you tell us!" },
];

// Everyday use cases that OpenClaw can organize
const FEATURES_LIST = [
  // Communication
  { id: "Email management", icon: "📧", description: "Read, draft, and organize emails automatically" },
  { id: "Calendar scheduling", icon: "📅", description: "Schedule meetings, find optimal times, send invites" },
  { id: "Chat responses", icon: "💬", description: "Handle DMs, Slack, customer support chats" },
  { id: "Call summaries", icon: "📞", description: "Transcribe and summarize voice calls" },
  
  // Content & Creation
  { id: "Content writing", icon: "✍️", description: "Blog posts, social media, newsletters, copy" },
  { id: "Image generation", icon: "🎨", description: "Create visuals, graphics, designs on demand" },
  { id: "Video editing", icon: "🎬", description: "Edit clips, add captions, create shorts" },
  { id: "Code generation", icon: "💻", description: "Write, review, debug code in any language" },
  
  // Research & Analysis
  { id: "Web research", icon: "🔍", description: "Deep research on any topic, competitive analysis" },
  { id: "Data analysis", icon: "📊", description: "Analyze spreadsheets, create reports, find insights" },
  { id: "Document reading", icon: "📄", description: "Process PDFs, contracts, extract key info" },
  { id: "Trend monitoring", icon: "📈", description: "Track industry trends, news, market changes" },
  
  // Business Operations
  { id: "CRM management", icon: "🗂️", description: "Update contacts, track deals, follow-ups" },
  { id: "Invoicing", icon: "💰", description: "Generate invoices, track payments, reminders" },
  { id: "Social media", icon: "🐦", description: "Post, schedule, engage across platforms" },
  { id: "Lead generation", icon: "🎯", description: "Find prospects, scrape contacts, enrich data" },
  
  // Personal Life
  { id: "Travel planning", icon: "✈️", description: "Book flights, hotels, create itineraries" },
  { id: "Shopping deals", icon: "🛒", description: "Find best prices, track deals, make lists" },
  { id: "Health tracking", icon: "❤️", description: "Monitor habits, suggest improvements" },
  { id: "Learning coach", icon: "📚", description: "Create study plans, quiz you, find resources" },
];

const MATT_PERSONALITY = {
  greetings: [
    "Hey! I'm Matt. For $5/day, I'll deploy your personal AI agent in 15 minutes. Ready?",
    "Hello! I'm Matt — let's build your AI agent. Just $5/day, no contracts.",
    "Hi! Matt here. What kind of AI agent can I build for you today?",
  ],
  typePrompts: [
    "What kind of AI are we building? Pick the closest match:",
    "Let's start with the type of agent you need:",
    "What role will this AI play in your life?",
  ],
  nameResponses: [
    (name: string) => `Nice to meet you! ${name} sounds like a great name.`,
    (name: string) => `${name} - I like it! Has a nice ring to it.`,
    (name: string) => `Got it! ${name} is locked in.`,
  ],
  purposePrompts: [
    "So, what will this agent actually do? Give me the details!",
    "Tell me about the mission. What's the end goal?",
    "What's the big picture here? What problem are we solving?",
  ],
  featurePrompts: [
    "Alright, let's pick some superpowers for your agent.",
    "What capabilities should we pack into this bad boy?",
    "Time to choose the features. What's essential?",
  ],
  confirmPrompts: [
    "Looking good! Ready to make it real?",
    "Everything checks out. Shall we deploy?",
    "This is going to be epic. Confirm when ready!",
  ],
  deploying: [
    "Firing up the engines...",
    "Waking up Devin to do the heavy lifting...",
    "Deploying your agent to the cloud...",
    "This is the exciting part!",
  ],
  success: [
    "Boom! Your agent is live!",
    "All systems go! Agent deployed successfully.",
    "It's alive! Your agent is ready to roll.",
  ],
};

function getRandomResponse(type: keyof typeof MATT_PERSONALITY, ...args: string[]): string {
  const responses = MATT_PERSONALITY[type];
  const randomIndex = Math.floor(Math.random() * responses.length);
  const response = responses[randomIndex];
  if (typeof response === 'function') {
    return (response as (arg: string) => string)(args[0] || '');
  }
  return response;
}

export default function Home() {
  const [sessionId] = useState<string>(() => getOrCreateSessionId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<SetupConfig>({
    agentName: "",
    agentType: "",
    purpose: "",
    features: [],
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
        content: getRandomResponse('greetings'),
        options: ["Let's build something"],
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
    const stepOrder: Step[] = ["intro", "name", "type", "purpose", "features", "confirm"];
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
      simulateTyping("First things first - what should we name your AI agent?");
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
    setStep("type");
    await simulateTyping(
      getRandomResponse('nameResponses', name) + " " + getRandomResponse('typePrompts'),
      AGENT_TYPES.map(t => t.id)
    );
  };

  const handleTypeSelect = async (type: string) => {
    await enableAudio();
    playOptionSelected();
    setConfig((prev) => ({ ...prev, agentType: type }));
    addMessage("user", type);
    setStep("purpose");
    
    const typeObj = AGENT_TYPES.find(t => t.id === type);
    const extraPrompt = typeObj && typeObj.id !== "Custom" 
      ? `\n\nA ${type} - great choice! ` 
      : "\n\nA custom agent - love the creativity! ";
    
    await simulateTyping(
      extraPrompt + getRandomResponse('purposePrompts')
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
    await simulateTyping(getRandomResponse('featurePrompts'));
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
    addMessage("user", `Selected: ${config.features.join(", ")}`);
    setStep("confirm");
    await simulateTyping(
      `${getRandomResponse('confirmPrompts')}\n\n**${config.agentName}** (${config.agentType})\nPurpose: ${config.purpose}\nFeatures: ${config.features.length} selected\n\nOne-time setup: **$150** (includes first month)`,
      ["Deploy my agent!"]
    );
  };

  const handleConfirm = async (action: string) => {
    await enableAudio();
    if (action === "Deploy my agent!") {
      playOptionSelected();
      savePendingConfig({ ...config, createdAt: Date.now() });
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = async () => {
    playSuccess();
    setShowPayment(false);
    setIsDeploying(true);
    addMessage("assistant", getRandomResponse('deploying'), []);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, tier: 'standard', sessionId }),
      });

      if (!response.ok) {
        throw new Error('Deployment failed');
      }

      const data = await response.json();
      clearPendingConfig();
      setIsDeploying(false);
      addMessage("assistant", 
        `${getRandomResponse('success')}\n\nYour agent is being built by Devin. You can watch the progress here: ${data.devinSession?.url || 'Dashboard'}`,
        ["Build another agent"]
      );
    } catch (error: any) {
      setIsDeploying(false);
      addMessage("assistant", `Hmm, something went wrong: ${error.message}. Want to try again?`, ["Retry deployment"]);
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
    if (option === "Let's build something" || option === "Build another agent") {
      setConfig({ agentName: "", agentType: "", purpose: "", features: [] });
      setStep("intro");
      setMessages([]);
      setTimeout(() => {
        setMessages([{
          id: "welcome2",
          role: "assistant",
          content: getRandomResponse('greetings'),
          options: ["Let's build something"],
        }]);
        startDeployment();
      }, 200);
    } else if (AGENT_TYPES.some(t => t.id === option)) {
      handleTypeSelect(option);
    } else if (step === "features") {
      handleFeatureSelect(option);
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
    <main className="h-[100dvh] w-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex flex-col lg:flex-row">
      {/* Left Side - AI Orb Visual */}
      <div className="lg:w-5/12 h-[30vh] lg:h-full flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-r border-[var(--border)]">
        {/* Decorative corners */}
        <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-[#0ea5e9]/30" />
        <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-[#0ea5e9]/30" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-[#0ea5e9]/30" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-[#0ea5e9]/30" />

        {/* Navigation */}
        <nav className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
          <Link href="/pricing" className="text-xs font-mono text-[var(--muted)] hover:text-[#0ea5e9] transition-colors flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            PRICING
          </Link>
          <span className="text-[var(--border)]">|</span>
          <Link href="/terms" className="text-xs font-mono text-[var(--muted)] hover:text-[#0ea5e9] transition-colors flex items-center gap-1">
            <FileText className="w-3 h-3" />
            TERMS
          </Link>
          <span className="text-[var(--border)]">|</span>
          <Link href="/privacy" className="text-xs font-mono text-[var(--muted)] hover:text-[#0ea5e9] transition-colors flex items-center gap-1">
            <Shield className="w-3 h-3" />
            PRIVACY
          </Link>
        </nav>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative z-10"
        >
          <AIOrb state={isDeploying ? "deploying" : isTyping ? "thinking" : "idle"} />
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

      {/* Right Side - Jarvis Interface */}
      <div className="lg:w-7/12 h-[70vh] lg:h-full bg-[var(--card)]/30 relative">
        {/* Main content area with padding for footer */}
        <div className="absolute inset-0 bottom-8 overflow-hidden">
          <JarvisInterface
            messages={messages}
            isTyping={isTyping}
            isDeploying={isDeploying}
            canGoBack={canGoBack}
            onBack={handleBack}
            onOptionClick={handleOptionClick}
          >
            {/* Agent Type Selection UI */}
            {step === "type" && (
              <div className="p-4 pb-20 space-y-3 overflow-y-auto max-h-[40vh]">
                <div className="grid grid-cols-1 gap-2">
                  {AGENT_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = config.agentType === type.id;
                    return (
                      <motion.button
                        key={type.id}
                        onClick={() => handleTypeSelect(type.id)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]"
                            : "bg-[var(--card)] border-[var(--border)] hover:border-[#0ea5e9]/50"
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isSelected ? "bg-[#0ea5e9]/20" : "bg-[var(--card)]"}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isSelected ? "text-[#0ea5e9]" : ""}`}>
                            {type.id}
                          </p>
                          <p className="text-xs text-[var(--muted)]">{type.description}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Feature Selection UI */}
            {step === "features" && (
              <div className="p-4 pb-20 space-y-3 overflow-y-auto max-h-[50vh]">
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
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? "text-[#0ea5e9]" : ""}`}>
                            {feature.id}
                          </p>
                          <p className="text-xs text-[var(--muted)] line-clamp-1">{feature.description}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
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

            {/* Input - with bottom padding to avoid footer overlap */}
            {(step === "name" || step === "purpose") && (
              <div className="p-4 pb-20 border-t border-[var(--border)]">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => enableAudio()}
                    placeholder={step === "name" ? "Enter agent name..." : "What will this agent do?"}
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

      {/* Footer with links - fixed at bottom of right panel only */}
      <footer className="fixed bottom-0 right-0 w-full lg:w-7/12 py-2 px-4 z-40 border-t border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted)]">
          <div className="flex items-center gap-4">
            <span>SECURE CONNECTION</span>
            <span className="hidden sm:inline">|</span>
            <Link href="/pricing" className="hidden sm:inline hover:text-[#0ea5e9] transition-colors">PRICING</Link>
            <Link href="/terms" className="hidden sm:inline hover:text-[#0ea5e9] transition-colors">TERMS</Link>
            <Link href="/privacy" className="hidden sm:inline hover:text-[#0ea5e9] transition-colors">PRIVACY</Link>
          </div>
          <span>ENCRYPTED</span>
        </div>
      </footer>
    </main>
  );
}
