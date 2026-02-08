"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { StepWelcome } from "./components/wizard/StepWelcome";
import { StepAgentName } from "./components/wizard/StepAgentName";
import { StepAgentType } from "./components/wizard/StepAgentType";
import { StepExpectations } from "./components/wizard/StepExpectations";
import { StepChannel } from "./components/wizard/StepChannel";
import { StepTelegramContact } from "./components/wizard/StepTelegramContact";
import { StepPayment } from "./components/wizard/StepPayment";
import { StepDeploy } from "./components/wizard/StepDeploy";
import { PaymentModal } from "./components/PaymentModal";
import { AIOrb } from "./components/AIOrb";

type Step = "welcome" | "agent-name" | "agent-type" | "expectations" | "channel" | "telegram-contact" | "payment" | "deploy";
type DeployStatus = "deploying" | "completed" | "failed";

export default function Home() {
  const { login, authenticated, user } = usePrivy();
  const [step, setStep] = useState<Step>("welcome");
  const [agentName, setAgentName] = useState("");
  const [agentType, setAgentType] = useState("");
  const [expectations, setExpectations] = useState<string[]>([]);
  const [channel, setChannel] = useState("telegram");
  const [telegramContact, setTelegramContact] = useState("");
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("deploying");
  const [deployProgress, setDeployProgress] = useState(0);
  const [telegramLink, setTelegramLink] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [agentId, setAgentId] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [config, setConfig] = useState({ 
    agentName: "", 
    useCase: "", 
    scope: "", 
    contactMethod: "telegram",
    telegramContact: ""
  });

  const handleStart = () => setStep("agent-name");

  const handleAgentNameSubmit = (name: string) => {
    setAgentName(name);
    setConfig(prev => ({ ...prev, agentName: name }));
    setStep("agent-type");
  };

  const handleAgentTypeSelect = (type: string, description: string) => {
    setAgentType(type);
    setConfig(prev => ({ ...prev, scope: description }));
    
    // Check auth before expectations
    if (!authenticated) {
      login();
      return;
    }
    setStep("expectations");
  };

  const handleExpectationsSubmit = (selected: string[]) => {
    setExpectations(selected);
    setConfig(prev => ({ ...prev, useCase: selected.join(", ") }));
    setStep("channel");
  };

  const handleChannelSelect = (selectedChannel: string) => {
    setChannel(selectedChannel);
    setConfig(prev => ({ ...prev, contactMethod: selectedChannel }));
    if (selectedChannel === "telegram") {
      setStep("telegram-contact");
    } else {
      setStep("payment");
    }
  };

  const handleTelegramContactSubmit = (contact: string) => {
    setTelegramContact(contact);
    setConfig(prev => ({ ...prev, telegramContact: contact }));
    setStep("payment");
  };

  const handlePaymentContinue = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setStep("deploy");
    
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName,
          agentType,
          expectations,
          channel,
          telegramContact,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create agent");
      }

      const data = await response.json();
      setAgentId(data.id);
      pollAgentStatus(data.id);
      
    } catch (error) {
      console.error("Deployment error:", error);
      setDeployStatus("failed");
    }
  };

  const pollAgentStatus = useCallback(async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/agents/status?agentId=${id}`);
        if (!response.ok) return;
        
        const agent = await response.json();
        
        if (agent.status === "pending") {
          setDeployProgress(10);
        } else if (agent.status === "deploying") {
          setDeployProgress(50);
        } else if (agent.status === "active") {
          setDeployProgress(100);
          setDeployStatus("completed");
          setTelegramLink(agent.telegramLink || `https://t.me/${agent.name.toLowerCase()}_bot`);
          setAuthCode(agent.authCode || "");
          clearInterval(interval);
        } else if (agent.status === "error") {
          setDeployStatus("failed");
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 3000);

    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  }, []);

  const getProgressWidth = () => {
    const steps: Step[] = ["welcome", "agent-name", "agent-type", "expectations", "channel", "telegram-contact", "payment", "deploy"];
    const index = steps.indexOf(step);
    return `${(index / (steps.length - 1)) * 100}%`;
  };

  const getOrbState = () => {
    if (step === "deploy") return "deploying";
    if (step === "expectations") return "processing";
    if (step === "welcome") return "idle";
    return "idle";
  };

  return (
    <div className="min-h-screen bg-[var(--background)] bg-glow relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-md" />
            <span className="font-bold text-xl text-[var(--foreground)]">Matt</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Pricing</Link>
            <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Dashboard</Link>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="fixed top-16 left-0 right-0 z-40">
        <div className="h-1 bg-[var(--border)]">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={{ width: "0%" }}
            animate={{ width: getProgressWidth() }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-28 pb-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* AI Orb */}
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 sm:w-40 sm:h-40">
              <AIOrb 
                wizardState={getOrbState()} 
                showGreeting={step === "welcome"}
              />
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {step === "welcome" && (
              <motion.div key="welcome" exit={{ opacity: 0, x: -20 }}>
                <StepWelcome onStart={handleStart} />
              </motion.div>
            )}

            {step === "agent-name" && (
              <motion.div key="agent-name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepAgentName onSubmit={handleAgentNameSubmit} />
              </motion.div>
            )}

            {step === "agent-type" && (
              <motion.div key="agent-type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepAgentType onSelect={handleAgentTypeSelect} />
              </motion.div>
            )}

            {step === "expectations" && (
              <motion.div key="expectations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepExpectations 
                  agentName={agentName}
                  onSubmit={handleExpectationsSubmit} 
                />
              </motion.div>
            )}

            {step === "channel" && (
              <motion.div key="channel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepChannel onSelect={handleChannelSelect} />
              </motion.div>
            )}

            {step === "telegram-contact" && (
              <motion.div key="telegram-contact" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepTelegramContact onSubmit={handleTelegramContactSubmit} />
              </motion.div>
            )}

            {step === "payment" && (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepPayment 
                  agentName={agentName}
                  onContinue={handlePaymentContinue}
                />
              </motion.div>
            )}

            {step === "deploy" && (
              <motion.div key="deploy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <StepDeploy 
                  agentName={agentName}
                  status={deployStatus}
                  progress={deployProgress}
                  telegramLink={telegramLink}
                  authCode={authCode}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        config={config}
        sessionId={`sess_${Date.now()}`}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
