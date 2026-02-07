"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { StepName } from "./components/wizard/StepName";
import { StepPersonality } from "./components/wizard/StepPersonality";
import { StepDemo } from "./components/wizard/StepDemo";
import { StepPayment } from "./components/wizard/StepPayment";
import { StepDeploy } from "./components/wizard/StepDeploy";
import { PaymentModal } from "./components/PaymentModal";
import { AIOrb } from "./components/AIOrb";

type Step = "name" | "personality" | "demo" | "payment" | "deploy";
type DeployStatus = "deploying" | "completed" | "failed";

export default function Home() {
  const { login, authenticated, user } = usePrivy();
  const [step, setStep] = useState<Step>("name");
  const [agentName, setAgentName] = useState("");
  const [personality, setPersonality] = useState("");
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("deploying");
  const [deployProgress, setDeployProgress] = useState(0);
  const [telegramLink, setTelegramLink] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [agentId, setAgentId] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [config, setConfig] = useState({ agentName: "", useCase: "", scope: "", contactMethod: "telegram" });

  const handleNameSubmit = (name: string) => {
    setAgentName(name);
    setConfig(prev => ({ ...prev, agentName: name }));
    setStep("personality");
  };

  const handlePersonalitySelect = (p: string) => {
    setPersonality(p);
    setConfig(prev => ({ ...prev, scope: p, useCase: "assistant" }));
    setStep("demo");
  };

  const handleDemoComplete = () => {
    if (!authenticated) {
      login();
      return;
    }
    setStep("payment");
  };

  const handlePaymentContinue = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    setStep("deploy");
    
    try {
      // Create agent via API
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName,
          personality,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create agent");
      }

      const data = await response.json();
      setAgentId(data.id);
      
      // Start polling for status
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
        
        // Update progress based on status
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

    // Cleanup after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
            <span className="font-bold text-xl">Matt</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/pricing" className="text-sm text-gray-400 hover:text-white">Pricing</a>
            <a href="/dashboard" className="text-sm text-gray-400 hover:text-white">Dashboard</a>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="fixed top-16 left-0 right-0 z-40">
        <div className="h-1 bg-gray-800">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={{ width: "0%" }}
            animate={{ width: `${["name", "personality", "demo", "payment", "deploy"].indexOf(step) * 25}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* AI Orb (visual flair) */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24">
              <AIOrb wizardState={step === "deploy" ? "deploying" : step === "demo" ? "processing" : "idle"} />
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {step === "name" && (
              <motion.div key="name" exit={{ opacity: 0, x: -20 }}>
                <StepName onSubmit={handleNameSubmit} />
              </motion.div>
            )}

            {step === "personality" && (
              <motion.div key="personality" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepPersonality onSelect={handlePersonalitySelect} />
              </motion.div>
            )}

            {step === "demo" && (
              <motion.div key="demo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepDemo 
                  agentName={agentName} 
                  personality={personality} 
                  onContinue={handleDemoComplete} 
                />
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
