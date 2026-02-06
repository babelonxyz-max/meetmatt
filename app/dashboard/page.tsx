"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Bot, 
  CreditCard, 
  Plus, 
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Settings
} from "lucide-react";
import { motion } from "framer-motion";

interface DashboardData {
  user: {
    id: string;
    email: string | null;
    walletAddress: string | null;
    name: string | null;
    createdAt: string;
  };
  agents: any[];
  payments: any[];
  stats: {
    totalAgents: number;
    activeSubscriptions: number;
    expired: number;
    inTrial: number;
  };
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  active: { color: "bg-green-500", icon: CheckCircle2, label: "Active" },
  trial: { color: "bg-amber-500", icon: Clock, label: "Trial" },
  expired: { color: "bg-red-500", icon: AlertCircle, label: "Expired" },
  pending: { color: "bg-blue-500", icon: Loader2, label: "Pending" },
};

export default function DashboardPage() {
  const { authenticated, user, logout } = usePrivy();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated || !user) {
      setLoading(false);
      return;
    }

    async function fetchDashboard() {
      if (!user) return;
      try {
        const response = await fetch("/api/user/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyId: user.id,
            email: user.email?.address,
            walletAddress: user.wallet?.address,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load dashboard");
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err: any) {
        console.error("[Dashboard] Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [authenticated, user]);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <div className="text-center">
          <Bot className="w-16 h-16 mx-auto mb-4 text-[var(--accent)] opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Welcome to Matt</h1>
          <p className="text-[var(--muted)] mb-6">Please sign in to access your dashboard</p>
          <Link href="/" className="text-[var(--accent)] hover:underline">
            Go Home →
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--accent)]" />
          <p className="text-[var(--muted)]">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pt-20">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-[var(--muted)] mb-4">{error}</p>
          <button 
            onClick={() => logout()} 
            className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--card)]/80"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { agents, payments, stats } = data;

  return (
    <div className="min-h-screen bg-[var(--background)] pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Welcome */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Your Workspace</h1>
          <p className="text-[var(--muted)]">Manage your AI agents and billing</p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard 
            label="Total Agents" 
            value={stats.totalAgents} 
            icon={Bot}
            color="blue"
          />
          <StatCard 
            label="Active" 
            value={stats.activeSubscriptions} 
            icon={CheckCircle2}
            color="green"
          />
          <StatCard 
            label="In Trial" 
            value={stats.inTrial} 
            icon={Clock}
            color="amber"
          />
          <StatCard 
            label="Expired" 
            value={stats.expired} 
            icon={AlertCircle}
            color="red"
          />
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Agents */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create New CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link href="/">
                <div className="group relative overflow-hidden bg-gradient-to-r from-[var(--accent)] to-[#6366f1] rounded-xl p-6 text-white cursor-pointer">
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Create New Agent</h3>
                      <p className="text-white/80 text-sm">Deploy in 15 minutes</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </div>
              </Link>
            </motion.div>

            {/* Agents Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[var(--accent)]" />
                  Your AI Agents
                </h2>
                <span className="text-xs text-[var(--muted)]">{agents.length} total</span>
              </div>

              {agents.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
                    <Bot className="w-6 h-6 text-[var(--muted)]" />
                  </div>
                  <h3 className="font-medium mb-1">No agents yet</h3>
                  <p className="text-sm text-[var(--muted)]">Create your first AI agent to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {agents.map((agent) => {
                    const status = statusConfig[agent.subscriptionStatus] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    
                    return (
                      <div 
                        key={agent.id} 
                        className="p-4 hover:bg-[var(--card)]/50 transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate">{agent.name}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${status.color.replace('bg-', 'bg-').replace('500', '500/10')} ${status.color.replace('bg-', 'text-')}`}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--muted)]">
                              {agent.subscriptionType === 'annual' ? 'Annual plan' : 'Monthly plan'}
                              {agent.currentPeriodEnd && ` • Renews ${new Date(agent.currentPeriodEnd).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {agent.devinUrl && (
                              <a
                                href={agent.devinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--card)] transition-colors"
                                title="View Agent"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </a>
                            )}
                            {agent.subscriptionStatus === "expired" && (
                              <Link href="/billing">
                                <button className="px-3 py-1.5 bg-[var(--accent)] text-white text-xs font-medium rounded-lg hover:opacity-90">
                                  Renew
                                </button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Billing Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5"
            >
              <h3 className="font-medium mb-4 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[var(--muted)]" />
                Billing
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Current Plan</span>
                  <span className="font-medium">Pro</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Monthly Cost</span>
                  <span className="font-medium">$150</span>
                </div>
              </div>

              <Link href="/billing">
                <button className="w-full mt-4 py-2 px-4 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg text-sm font-medium hover:bg-[var(--accent)]/20 transition-colors">
                  Manage Billing
                </button>
              </Link>
            </motion.div>

            {/* Recent Payments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h3 className="font-medium text-sm">Recent Payments</h3>
              </div>
              
              {payments.length === 0 ? (
                <div className="p-5 text-center">
                  <p className="text-sm text-[var(--muted)]">No payments yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {payments.slice(0, 5).map((payment: any) => (
                    <div key={payment.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">${payment.amount}</div>
                        <div className="text-xs text-[var(--muted)]">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <StatusBadge status={payment.status} />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5"
            >
              <h3 className="font-medium mb-3 text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-[var(--muted)]" />
                Account
              </h3>
              <button
                onClick={logout}
                className="w-full py-2 px-3 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left"
              >
                Sign Out
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colors: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/20 text-blue-500",
    green: "from-green-500/20 to-green-600/20 text-green-500",
    amber: "from-amber-500/20 to-amber-600/20 text-amber-500",
    red: "from-red-500/20 to-red-600/20 text-red-500",
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-[var(--muted)]">{label}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    confirmed: "bg-green-500/10 text-green-500",
    pending: "bg-amber-500/10 text-amber-500",
    failed: "bg-red-500/10 text-red-500",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-[var(--muted)]/10 text-[var(--muted)]"}`}>
      {status}
    </span>
  );
}
