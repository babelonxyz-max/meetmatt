"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft,
  Rocket,
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  TrendingUp,
  Pause,
  Activity,
  Terminal,
  Users,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";

interface Fleet {
  id: string;
  name: string;
  description?: string;
  status: string;
  statusMessage?: string;
  progress: {
    totalAgents: number;
    deployedAgents: number;
    failedAgents: number;
    pendingAgents: number;
  };
  config: {
    targetAgentCount: number;
    batchSize: number;
    concurrencyLimit: number;
    provider: string;
    agentTemplate: {
      namePrefix: string;
      personality: string;
      useCase: string;
      capabilities: string[];
    };
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface FleetAgent {
  id: string;
  name: string;
  instanceNumber: number;
  status: string;
  runtime?: {
    endpoint?: string;
    sessionId?: string;
  };
  health?: {
    isHealthy: boolean;
    latency?: number;
    lastCheckAt: string;
  };
  startedAt?: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  draft: { color: "bg-gray-500", icon: Clock, label: "Draft" },
  provisioning: { color: "bg-blue-500", icon: Server, label: "Provisioning" },
  deploying: { color: "bg-amber-500", icon: Rocket, label: "Deploying" },
  running: { color: "bg-green-500", icon: CheckCircle2, label: "Running" },
  scaling: { color: "bg-purple-500", icon: TrendingUp, label: "Scaling" },
  error: { color: "bg-red-500", icon: XCircle, label: "Error" },
  paused: { color: "bg-orange-500", icon: Pause, label: "Paused" },
  terminated: { color: "bg-gray-400", icon: XCircle, label: "Terminated" },
};

const agentStatusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-gray-400", label: "Pending" },
  provisioning: { color: "bg-blue-400", label: "Provisioning" },
  starting: { color: "bg-amber-400", label: "Starting" },
  running: { color: "bg-green-400", label: "Running" },
  error: { color: "bg-red-400", label: "Error" },
  stopped: { color: "bg-gray-400", label: "Stopped" },
};

export default function FleetDetailPage({ params }: { params: { id: string } }) {
  const { authenticated, user } = usePrivy();
  const router = useRouter();
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [agents, setAgents] = useState<FleetAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    fetchFleetDetails();
    
    // Poll for updates every 3 seconds if deploying
    const interval = setInterval(() => {
      if (fleet?.status === "deploying" || fleet?.status === "provisioning") {
        fetchFleetDetails();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [authenticated, params.id, fleet?.status]);

  async function fetchFleetDetails() {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/fleet/${params.id}`, {
        headers: {
          "x-user-id": user.id,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/fleet");
          return;
        }
        throw new Error("Failed to load fleet details");
      }

      const data = await response.json();
      setFleet(data.data);
      setAgents(data.data.agents || []);
      setError(null);
    } catch (err: any) {
      console.error("[FleetDetail] Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleScale() {
    const newCount = prompt("Enter new agent count:", fleet?.config.targetAgentCount.toString());
    if (!newCount || !fleet) return;
    
    const count = parseInt(newCount);
    if (isNaN(count) || count < 1) {
      alert("Invalid count");
      return;
    }

    try {
      const response = await fetch(`/api/fleet/${params.id}/scale`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ targetCount: count }),
      });

      if (!response.ok) {
        throw new Error("Failed to scale fleet");
      }

      fetchFleetDetails();
    } catch (err: any) {
      alert(`Scaling failed: ${err.message}`);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Sign in Required</h1>
          <Link href="/" className="text-[var(--accent)] hover:underline">
            Go Home →
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!fleet) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Fleet Not Found</h1>
          <Link href="/fleet" className="text-[var(--accent)] hover:underline">
            Back to Fleets →
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[fleet.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const progressPercent = fleet.progress?.totalAgents > 0 
    ? Math.round((fleet.progress.deployedAgents / fleet.progress.totalAgents) * 100) 
    : 0;

  return (
    <div className="min-h-screen py-8 pb-20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/fleet">
            <button className="p-2 hover:bg-[var(--card)] rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{fleet.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${status.color.replace('bg-', 'bg-').replace('500', '500/10')} ${status.color.replace('bg-', 'text-')}`}>
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </span>
            </div>
            <p className="text-[var(--muted)]">
              Created {new Date(fleet.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchFleetDetails}
              className="p-2 hover:bg-[var(--card)] rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleScale}
              disabled={fleet.status === "terminated"}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Scale
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="Total Agents" 
            value={fleet.progress?.totalAgents || 0}
            icon={Users}
            color="blue"
          />
          <StatCard 
            label="Running" 
            value={fleet.progress?.deployedAgents || 0}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard 
            label="Failed" 
            value={fleet.progress?.failedAgents || 0}
            icon={XCircle}
            color="red"
          />
          <StatCard 
            label="Pending" 
            value={fleet.progress?.pendingAgents || 0}
            icon={Clock}
            color="amber"
          />
        </div>

        {/* Progress Section */}
        {(fleet.status === "deploying" || fleet.status === "provisioning") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Rocket className="w-5 h-5 text-[var(--accent)]" />
                Deployment Progress
              </h2>
              <span className="text-2xl font-bold text-[var(--accent)]">{progressPercent}%</span>
            </div>
            <div className="h-4 bg-[var(--background)] rounded-full overflow-hidden mb-2">
              <motion.div 
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[#6366f1]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex justify-between text-sm text-[var(--muted)]">
              <span>{fleet.progress?.deployedAgents || 0} deployed</span>
              <span>{fleet.progress?.pendingAgents || 0} pending</span>
              <span>{fleet.progress?.failedAgents || 0} failed</span>
            </div>
            {fleet.statusMessage && (
              <p className="mt-3 text-sm text-[var(--muted)] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {fleet.statusMessage}
              </p>
            )}
          </motion.div>
        )}

        {/* Configuration */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-[var(--accent)]" />
            Configuration
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-[var(--muted)] mb-1">Provider</div>
              <div className="font-medium capitalize">{fleet.config?.provider}</div>
            </div>
            <div>
              <div className="text-[var(--muted)] mb-1">Batch Size</div>
              <div className="font-medium">{fleet.config?.batchSize} agents</div>
            </div>
            <div>
              <div className="text-[var(--muted)] mb-1">Concurrency</div>
              <div className="font-medium">{fleet.config?.concurrencyLimit} parallel</div>
            </div>
            <div>
              <div className="text-[var(--muted)] mb-1">Personality</div>
              <div className="font-medium capitalize">{fleet.config?.agentTemplate?.personality}</div>
            </div>
          </div>
        </div>

        {/* Agents List */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[var(--accent)]" />
              Agents
            </h2>
            <span className="text-sm text-[var(--muted)]">
              Showing {agents.length} agents
            </span>
          </div>

          {agents.length === 0 ? (
            <div className="p-12 text-center">
              <Server className="w-12 h-12 mx-auto mb-4 text-[var(--muted)] opacity-50" />
              <p className="text-[var(--muted)]">No agents yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] max-h-96 overflow-auto">
              {agents.map((agent) => {
                const agentStatus = agentStatusConfig[agent.status] || agentStatusConfig.pending;
                
                return (
                  <div key={agent.id} className="px-6 py-4 flex items-center justify-between hover:bg-[var(--card)]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${agentStatus.color}`} />
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-[var(--muted)]">
                          #{agent.instanceNumber.toString().padStart(4, "0")}
                          {agent.health?.latency && ` • ${agent.health.latency}ms`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${agentStatus.color.replace('bg-', 'bg-').replace('400', '500/10')} ${agentStatus.color.replace('bg-', 'text-').replace('400', '500')}`}>
                        {agentStatus.label}
                      </span>
                      {agent.runtime?.endpoint && (
                        <a
                          href={agent.runtime.endpoint}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 text-[var(--muted)]" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    amber: "bg-amber-500/10 text-amber-500",
    red: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-[var(--muted)]">{label}</div>
    </div>
  );
}
