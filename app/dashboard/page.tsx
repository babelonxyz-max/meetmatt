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
  Send,
  MessageCircle,
  Copy,
  ExternalLink,
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
  agents: Agent[];
  payments: any[];
  stats: {
    totalAgents: number;
    activeSubscriptions: number;
    expired: number;
    inTrial: number;
  };
}

interface Agent {
  id: string;
  name: string;
  subscriptionStatus: string;
  subscriptionType: string;
  currentPeriodEnd?: string;
  devinUrl?: string;
  activationStatus: string;
  botUsername?: string;
  telegramLink?: string;
  authCode?: string;
  verifiedAt?: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  active: { color: "bg-green-500", icon: CheckCircle2, label: "Active" },
  trial: { color: "bg-amber-500", icon: Clock, label: "Trial" },
  expired: { color: "bg-red-500", icon: AlertCircle, label: "Expired" },
  pending: { color: "bg-blue-500", icon: Loader2, label: "Pending" },
};

const activationStatusConfig: Record<string, { color: string; icon: any; label: string; action?: string }> = {
  pending: { color: "bg-gray-500", icon: Clock, label: "Pending Payment", action: "Pay Now" },
  activating: { color: "bg-amber-500", icon: Loader2, label: "Activating..." },
  awaiting_verification: { color: "bg-purple-500", icon: MessageCircle, label: "Awaiting Verification", action: "Verify Now" },
  active: { color: "bg-green-500", icon: CheckCircle2, label: "Active" },
  failed: { color: "bg-red-500", icon: AlertCircle, label: "Failed", action: "Retry" },
};

export default function DashboardPage() {
  const { authenticated, user, logout } = usePrivy();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyingAgent, setVerifyingAgent] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");

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

  const handleVerify = async (agentId: string) => {
    if (!authCode.trim()) return;
    
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: agentId,
          code: authCode,
          telegramUserId: user?.id,
        }),
      });

      if (response.ok) {
        setVerifyingAgent(null);
        setAuthCode("");
        window.location.reload();
      } else {
        alert("Invalid auth code. Please try again.");
      }
    } catch (err) {
      alert("Error verifying code. Please try again.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!authenticated) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4 pt-20">
        <div className="text-center">
          <Bot className="w-20 h-20 mx-auto mb-4 text-[var(--accent)] opacity-50" />
          <h1 className="text-3xl font-bold mb-3">Welcome to Matt</h1>
          <p className="text-[var(--muted)] text-lg mb-6">Please sign in to access your dashboard</p>
          <Link href="/" className="text-[var(--accent)] hover:underline text-lg">
            Go Home →
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
          <p className="text-[var(--muted)] text-lg">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4 pt-20">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-[var(--muted)] text-lg mb-4">{error}</p>
          <button 
            onClick={() => logout()} 
            className="px-6 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:bg-[var(--card)]/80 text-lg"
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
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Welcome - BIGGER */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">Dashboard</h1>
          <p className="text-[var(--muted)] text-xl">Manage your AI agents and billing</p>
        </motion.div>

        {/* Quick Stats - BIGGER */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10"
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Agents */}
          <div className="lg:col-span-2 space-y-8">
            {/* Create New CTA - BIGGER */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link href="/">
                <div className="group relative overflow-hidden bg-gradient-to-r from-[var(--accent)] to-[#6366f1] rounded-2xl p-8 text-white cursor-pointer">
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-2xl mb-1">Create New Agent</h3>
                      <p className="text-white/80 text-lg">Deploy in 15 minutes</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </div>
              </Link>
            </motion.div>

            {/* Agents Section - BIGGER */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="font-semibold text-xl flex items-center gap-3">
                  <Bot className="w-6 h-6 text-[var(--accent)]" />
                  Your AI Agents
                </h2>
                <span className="text-base text-[var(--muted)]">{agents.length} total</span>
              </div>

              {agents.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
                    <Bot className="w-10 h-10 text-[var(--muted)]" />
                  </div>
                  <h3 className="font-medium text-xl mb-2">No agents yet</h3>
                  <p className="text-lg text-[var(--muted)]">Create your first AI agent to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {agents.map((agent) => {
                    const status = statusConfig[agent.subscriptionStatus] || statusConfig.pending;
                    const activationStatus = activationStatusConfig[agent.activationStatus] || activationStatusConfig.pending;
                    const StatusIcon = status.icon;
                    const ActivationIcon = activationStatus.icon;
                    const needsVerification = agent.activationStatus === "awaiting_verification";
                    
                    return (
                      <div 
                        key={agent.id} 
                        className="p-6 hover:bg-[var(--card)]/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-xl truncate">{agent.name}</h3>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${status.color.replace('bg-', 'bg-').replace('500', '500/10')} ${status.color.replace('bg-', 'text-')}`}>
                                <StatusIcon className="w-4 h-4" />
                                {status.label}
                              </span>
                            </div>
                            <p className="text-base text-[var(--muted)]">
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
                                className="p-3 text-[var(--muted)] hover:text-[var(--foreground)] rounded-xl hover:bg-[var(--card)] transition-colors"
                                title="View Agent"
                              >
                                <ArrowRight className="w-6 h-6" />
                              </a>
                            )}
                            {agent.subscriptionStatus === "expired" && (
                              <Link href="/billing">
                                <button className="px-4 py-2 bg-[var(--accent)] text-white text-base font-medium rounded-xl hover:opacity-90">
                                  Renew
                                </button>
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Activation Status */}
                        <div className="mb-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-base ${activationStatus.color.replace('bg-', 'bg-').replace('500', '500/10')} ${activationStatus.color.replace('bg-', 'text-')}`}>
                            <ActivationIcon className="w-4 h-4" />
                            {activationStatus.label}
                          </div>
                        </div>

                        {/* Bot Info (if available) */}
                        {(agent.botUsername || agent.telegramLink) && (
                          <div className="bg-[var(--background)] rounded-xl p-4 space-y-3">
                            {agent.botUsername && (
                              <div className="flex items-center justify-between">
                                <span className="text-base text-[var(--muted)]">Bot:</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-medium">@{agent.botUsername}</span>
                                  <button
                                    onClick={() => copyToClipboard(`@${agent.botUsername}`)}
                                    className="p-2 hover:bg-[var(--card)] rounded-lg transition-colors"
                                    title="Copy username"
                                  >
                                    <Copy className="w-5 h-5 text-[var(--muted)]" />
                                  </button>
                                </div>
                              </div>
                            )}
                            {agent.telegramLink && (
                              <div className="flex items-center justify-between">
                                <span className="text-base text-[var(--muted)]">Link:</span>
                                <a
                                  href={agent.telegramLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-base text-[var(--accent)] hover:underline"
                                >
                                  Open in Telegram
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Verification Section */}
                        {needsVerification && (
                          <div className="mt-4 pt-4 border-t border-[var(--border)]">
                            {verifyingAgent === agent.id ? (
                              <div className="flex gap-3">
                                <input
                                  type="text"
                                  value={authCode}
                                  onChange={(e) => setAuthCode(e.target.value)}
                                  placeholder="Enter auth code..."
                                  className="flex-1 px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-base focus:outline-none focus:border-[var(--accent)]"
                                />
                                <button
                                  onClick={() => handleVerify(agent.id)}
                                  disabled={!authCode.trim()}
                                  className="px-6 py-3 bg-[var(--accent)] text-white text-base font-medium rounded-xl hover:opacity-90 disabled:opacity-50"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => {
                                    setVerifyingAgent(null);
                                    setAuthCode("");
                                  }}
                                  className="px-4 py-3 text-[var(--muted)] hover:text-[var(--foreground)] text-base"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setVerifyingAgent(agent.id)}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-500/10 text-purple-500 text-lg font-medium rounded-xl hover:bg-purple-500/20 transition-colors"
                              >
                                <Send className="w-5 h-5" />
                                Enter Auth Code to Activate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Billing Summary - BIGGER */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6"
            >
              <h3 className="font-semibold mb-5 text-xl flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-[var(--muted)]" />
                Billing
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="text-[var(--muted)]">Current Plan</span>
                  <span className="font-medium">Pro</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-[var(--muted)]">Next billing</span>
                  <span className="font-medium">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                </div>
              </div>

              <Link href="/billing">
                <button className="w-full mt-6 px-6 py-4 bg-[var(--accent)] text-white text-lg font-medium rounded-xl hover:opacity-90 transition-opacity">
                  Manage Billing
                </button>
              </Link>
            </motion.div>

            {/* Recent Activity - BIGGER */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6"
            >
              <h3 className="font-semibold mb-5 text-xl">Recent Activity</h3>
              
              {payments.length === 0 ? (
                <p className="text-lg text-[var(--muted)]">No recent payments</p>
              ) : (
                <div className="space-y-4">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between text-lg">
                      <div>
                        <p className="font-medium">{payment.tier} Plan</p>
                        <p className="text-base text-[var(--muted)]">{new Date(payment.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="font-medium">${payment.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Settings Quick Link */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-[var(--muted)]" />
                  <span className="text-lg font-medium">Settings</span>
                </div>
                <Link href="/settings">
                  <button className="p-2 hover:bg-[var(--card)] rounded-lg transition-colors">
                    <ArrowRight className="w-5 h-5 text-[var(--muted)]" />
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
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
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
      <div className={`w-14 h-14 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-7 h-7" />
      </div>
      <p className="text-4xl font-bold">{value}</p>
      <p className="text-lg text-[var(--muted)]">{label}</p>
    </div>
  );
}
