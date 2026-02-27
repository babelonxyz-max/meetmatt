"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft,
  Rocket,
  Server,
  Users,
  Settings,
  Zap,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

const PERSONALITIES = [
  { 
    id: "professional", 
    label: "Professional", 
    icon: "💼",
    description: "Formal, business-focused communication",
  },
  { 
    id: "friendly", 
    label: "Friendly", 
    icon: "💜",
    description: "Warm, conversational approach",
  },
  { 
    id: "hustler", 
    label: "Hustler", 
    icon: "⚡",
    description: "Direct, results-focused messaging",
  },
];

const PROVIDERS = [
  { 
    id: "openclaw", 
    label: "OpenClaw", 
    icon: Server,
    description: "Local/remote OpenClaw runtime",
    recommended: true,
  },
  { 
    id: "devin", 
    label: "Devin", 
    icon: Zap,
    description: "Devin AI orchestration layer",
  },
];

interface FormData {
  name: string;
  description: string;
  targetAgentCount: number;
  batchSize: number;
  concurrencyLimit: number;
  provider: string;
  agentTemplate: {
    namePrefix: string;
    personality: string;
    useCase: string;
    capabilities: string[];
    model: string;
  };
}

export default function CreateFleetPage() {
  const { authenticated, user } = usePrivy();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    targetAgentCount: 10,
    batchSize: 5,
    concurrencyLimit: 3,
    provider: "openclaw",
    agentTemplate: {
      namePrefix: "",
      personality: "professional",
      useCase: "assistant",
      capabilities: [],
      model: "qwen3-coder",
    },
  });

  const updateForm = (updates: Partial<FormData> | Partial<FormData["agentTemplate"]>, isTemplate = false) => {
    if (isTemplate) {
      setFormData(prev => ({
        ...prev,
        agentTemplate: { ...prev.agentTemplate, ...updates },
      }));
    } else {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const config = {
        targetAgentCount: formData.targetAgentCount,
        batchSize: formData.batchSize,
        concurrencyLimit: formData.concurrencyLimit,
        provider: formData.provider,
        runtimeConfig: formData.provider === "openclaw" ? {
          type: "openclaw",
          gatewayUrl: process.env.NEXT_PUBLIC_OPENCLAW_URL || "http://localhost:18789",
          instances: [],
          maxAgentsPerInstance: 50,
        } : {
          type: "devin",
          apiKey: "",
          orchestrationMode: "deploy",
        },
        agentTemplate: {
          namePrefix: formData.agentTemplate.namePrefix,
          personality: formData.agentTemplate.personality,
          useCase: formData.agentTemplate.useCase,
          capabilities: formData.agentTemplate.capabilities,
          model: formData.agentTemplate.model,
        },
      };

      const response = await fetch("/api/fleet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          config,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to create fleet");
      }

      // Auto-deploy
      await fetch(`/api/fleet/${data.data.fleetId}/deploy`, {
        method: "POST",
        headers: {
          "x-user-id": user?.id || "",
        },
      });

      router.push("/fleet");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Rocket className="w-16 h-16 mx-auto mb-4 text-[var(--accent)] opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Sign in Required</h1>
          <p className="text-[var(--muted)] mb-4">Please sign in to create a fleet</p>
          <Link href="/" className="text-[var(--accent)] hover:underline">
            Go Home →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 pb-20">
      <div className="max-w-3xl mx-auto px-6 sm:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/fleet">
            <button className="p-2 hover:bg-[var(--card)] rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Create New Fleet</h1>
            <p className="text-[var(--muted)]">Deploy multiple AI agents at once</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s === step ? "bg-[var(--accent)] text-white" :
                s < step ? "bg-green-500 text-white" :
                "bg-[var(--card)] text-[var(--muted)]"
              }`}>
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <ChevronRight className="w-4 h-4 mx-2 text-[var(--muted)]" />}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-[var(--accent)]" />
                Fleet Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Fleet Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                    placeholder="My Support Bot Fleet"
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description (optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateForm({ description: e.target.value })}
                    placeholder="What is this fleet for?"
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--accent)]" />
                Fleet Size
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium">Number of Agents</label>
                    <span className="text-sm text-[var(--accent)] font-medium">
                      {formData.targetAgentCount} agents
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="1000"
                    value={formData.targetAgentCount}
                    onChange={(e) => updateForm({ targetAgentCount: parseInt(e.target.value) })}
                    className="w-full accent-[var(--accent)]"
                  />
                  <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
                    <span>1</span>
                    <span>500</span>
                    <span>1000</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Batch Size</label>
                    <select
                      value={formData.batchSize}
                      onChange={(e) => updateForm({ batchSize: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value={5}>5 agents</option>
                      <option value={10}>10 agents</option>
                      <option value={20}>20 agents</option>
                      <option value={50}>50 agents</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Concurrency</label>
                    <select
                      value={formData.concurrencyLimit}
                      onChange={(e) => updateForm({ concurrencyLimit: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value={1}>1 parallel</option>
                      <option value={3}>3 parallel</option>
                      <option value={5}>5 parallel</option>
                      <option value={10}>10 parallel</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!formData.name}
              className="w-full py-4 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* Step 2: Agent Configuration */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[var(--accent)]" />
                Agent Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Agent Name Prefix</label>
                  <input
                    type="text"
                    value={formData.agentTemplate.namePrefix}
                    onChange={(e) => updateForm({ namePrefix: e.target.value }, true)}
                    placeholder="support-bot"
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                  />
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Agents will be named: {formData.agentTemplate.namePrefix || "agent"}-0001, {formData.agentTemplate.namePrefix || "agent"}-0002, etc.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Personality</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PERSONALITIES.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => updateForm({ personality: p.id }, true)}
                        className={`p-4 border rounded-xl text-left transition-all ${
                          formData.agentTemplate.personality === p.id
                            ? "border-[var(--accent)] bg-[var(--accent)]/5"
                            : "border-[var(--border)] hover:border-[var(--accent)]/50"
                        }`}
                      >
                        <div className="text-2xl mb-2">{p.icon}</div>
                        <div className="font-medium text-sm">{p.label}</div>
                        <div className="text-xs text-[var(--muted)] mt-1">{p.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Use Case</label>
                  <input
                    type="text"
                    value={formData.agentTemplate.useCase}
                    onChange={(e) => updateForm({ useCase: e.target.value }, true)}
                    placeholder="customer support, sales, research..."
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 border border-[var(--border)] rounded-xl font-medium hover:bg-[var(--card)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.agentTemplate.namePrefix}
                className="flex-1 py-4 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Provider & Deploy */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-[var(--accent)]" />
                Runtime Provider
              </h2>
              
              <div className="space-y-3">
                {PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => updateForm({ provider: provider.id })}
                    className={`w-full p-4 border rounded-xl flex items-center gap-4 transition-all ${
                      formData.provider === provider.id
                        ? "border-[var(--accent)] bg-[var(--accent)]/5"
                        : "border-[var(--border)] hover:border-[var(--accent)]/50"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[var(--background)] flex items-center justify-center">
                      <provider.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.label}</span>
                        {provider.recommended && (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--muted)]">{provider.description}</p>
                    </div>
                    {formData.provider === provider.id && (
                      <Check className="w-5 h-5 text-[var(--accent)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Fleet Name</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Agents</span>
                  <span className="font-medium">{formData.targetAgentCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Name Prefix</span>
                  <span className="font-medium">{formData.agentTemplate.namePrefix}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Personality</span>
                  <span className="font-medium capitalize">{formData.agentTemplate.personality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Provider</span>
                  <span className="font-medium">{formData.provider}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                disabled={loading}
                className="flex-1 py-4 border border-[var(--border)] rounded-xl font-medium hover:bg-[var(--card)] transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-4 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Deploy Fleet
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
