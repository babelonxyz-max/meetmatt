"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus,
  ArrowRight,
  Loader2,
  AlertCircle,
  Rocket,
  Server,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  Pause,
  Play,
  Trash2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Fleet {
  id: string;
  name: string;
  description?: string;
  slug: string;
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
    provider: string;
    agentTemplate: {
      namePrefix: string;
      personality: string;
    };
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
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

export default function FleetDashboardPage() {
  const { authenticated, user } = usePrivy();
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      return;
    }

    fetchFleets();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchFleets, 5000);
    return () => clearInterval(interval);
  }, [authenticated, user]);

  async function fetchFleets() {
    if (!user) return;
    
    try {
      const response = await fetch("/api/fleet", {
        headers: {
          "x-user-id": user.id,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load fleets");
      }

      const data = await response.json();
      setFleets(data.data.fleets);
      setError(null);
    } catch (err: any) {
      console.error("[FleetDashboard] Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeploy(fleetId: string) {
    try {
      const response = await fetch(`/api/fleet/${fleetId}/deploy`, {
        method: "POST",
        headers: {
          "x-user-id": user?.id || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to start deployment");
      }

      // Refresh fleets
      fetchFleets();
    } catch (err: any) {
      alert(`Deployment failed: ${err.message}`);
    }
  }

  async function handleTerminate(fleetId: string) {
    if (!confirm("Are you sure you want to terminate this fleet?")) {
      return;
    }

    try {
      const response = await fetch(`/api/fleet/${fleetId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user?.id || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to terminate fleet");
      }

      // Refresh fleets
      fetchFleets();
    } catch (err: any) {
      alert(`Termination failed: ${err.message}`);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4 pt-20">
        <div className="text-center">
          <Rocket className="w-20 h-20 mx-auto mb-4 text-[var(--accent)] opacity-50" />
          <h1 className="text-3xl font-bold mb-3">Fleet Mode</h1>
          <p className="text-[var(--muted)] text-lg mb-6">Deploy 1000s of agents at once</p>
          <Link href="/" className="text-[var(--accent)] hover:underline text-lg">
            Sign in to continue →
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center pt-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[var(--accent)]" />
          <p className="text-[var(--muted)] text-lg">Loading your fleets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 pb-20">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-3">Fleet Mode</h1>
              <p className="text-[var(--muted)] text-xl">Deploy and manage 1000s of AI agents</p>
            </div>
            <Link href="/fleet/create">
              <button className="flex items-center gap-2 px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                <Plus className="w-5 h-5" />
                New Fleet
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Demo Mode Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3"
        >
          <Rocket className="w-5 h-5 text-amber-500" />
          <div className="flex-1">
            <span className="font-medium text-amber-500">Visual Preview Mode</span>
            <span className="text-[var(--muted)] ml-2">Backend infrastructure coming soon. Contact us to enable full Fleet Mode.</span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10"
        >
          <StatCard 
            label="Total Fleets" 
            value={fleets.length} 
            icon={Server}
            color="blue"
          />
          <StatCard 
            label="Running Agents" 
            value={fleets.reduce((acc, f) => acc + (f.progress?.deployedAgents || 0), 0)} 
            icon={Zap}
            color="green"
          />
          <StatCard 
            label="Deploying" 
            value={fleets.filter(f => f.status === "deploying").length} 
            icon={Rocket}
            color="amber"
          />
          <StatCard 
            label="Failed" 
            value={fleets.reduce((acc, f) => acc + (f.progress?.failedAgents || 0), 0)} 
            icon={AlertCircle}
            color="red"
          />
        </motion.div>

        {/* Fleets List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {fleets.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
                <Rocket className="w-12 h-12 text-[var(--muted)]" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No fleets yet</h2>
              <p className="text-lg text-[var(--muted)] mb-6">
                Create your first fleet to deploy multiple AI agents at once
              </p>
              <Link href="/fleet/create">
                <button className="px-8 py-4 bg-[var(--accent)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                  Create Your First Fleet
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {fleets.map((fleet, index) => (
                <FleetCard 
                  key={fleet.id} 
                  fleet={fleet} 
                  onDeploy={() => handleDeploy(fleet.id)}
                  onTerminate={() => handleTerminate(fleet.id)}
                  index={index}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 grid md:grid-cols-3 gap-6"
        >
          <InfoCard
            icon={Rocket}
            title="Mass Deployment"
            description="Deploy hundreds or thousands of agents in parallel using our distributed queue system."
          />
          <InfoCard
            icon={Activity}
            title="Real-time Monitoring"
            description="Track deployment progress and agent health in real-time with automatic recovery."
          />
          <InfoCard
            icon={Server}
            title="OpenClaw Runtime"
            description="Powered by OpenClaw for efficient local and remote agent execution."
          />
        </motion.div>
      </div>
    </div>
  );
}

function FleetCard({ 
  fleet, 
  onDeploy, 
  onTerminate,
  index 
}: { 
  fleet: Fleet; 
  onDeploy: () => void;
  onTerminate: () => void;
  index: number;
}) {
  const status = statusConfig[fleet.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  
  const progress = fleet.progress || { totalAgents: 0, deployedAgents: 0, failedAgents: 0, pendingAgents: 0 };
  const progressPercent = progress.totalAgents > 0 
    ? Math.round((progress.deployedAgents / progress.totalAgents) * 100) 
    : 0;
  
  const isDeploying = fleet.status === "deploying" || fleet.status === "provisioning" || fleet.status === "scaling";
  const canDeploy = fleet.status === "draft" || fleet.status === "error";
  const canTerminate = fleet.status !== "terminated";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent)]/30 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-xl truncate">{fleet.name}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${status.color.replace('bg-', 'bg-').replace('500', '500/10')} ${status.color.replace('bg-', 'text-')}`}>
              <StatusIcon className="w-4 h-4" />
              {status.label}
            </span>
          </div>
          <p className="text-base text-[var(--muted)]">
            {fleet.config?.targetAgentCount || 0} agents • {fleet.config?.agentTemplate?.personality || "default"} • {fleet.config?.provider || "openclaw"}
          </p>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {canDeploy && (
            <button
              onClick={onDeploy}
              className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
            >
              Deploy
            </button>
          )}
          
          {isDeploying && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">{progressPercent}%</span>
            </div>
          )}
          
          {canTerminate && (
            <button
              onClick={onTerminate}
              className="p-2 text-[var(--muted)] hover:text-red-500 rounded-xl hover:bg-red-500/10 transition-colors"
              title="Terminate Fleet"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          
          <Link href={`/fleet/${fleet.id}`}>
            <button className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-xl hover:bg-[var(--card)] transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      {(isDeploying || progress.deployedAgents > 0) && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--muted)]">
              {progress.deployedAgents} deployed
              {progress.failedAgents > 0 && ` • ${progress.failedAgents} failed`}
              {progress.pendingAgents > 0 && ` • ${progress.pendingAgents} pending`}
            </span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      {fleet.statusMessage && (
        <p className="mt-3 text-sm text-[var(--muted)]">{fleet.statusMessage}</p>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    amber: "bg-amber-500/10 text-amber-500",
    red: "bg-red-500/10 text-red-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent)]/20 transition-colors">
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-3xl font-bold text-[var(--foreground)]">{value}</p>
      <p className="text-base text-[var(--muted)]">{label}</p>
    </div>
  );
}

function InfoCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="bg-[var(--card)]/50 border border-[var(--border)] rounded-2xl p-6">
      <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-[var(--muted)]">{description}</p>
    </div>
  );
}
