"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { 
  CreditCard, 
  Bell, 
  Shield, 
  Trash2,
  ArrowLeft,
  Check,
  Sparkles,
  TrendingDown,
  Calendar,
  Wallet
} from "lucide-react";
import { calculatePricing, getPricingOptions, formatPrice, PricingOption } from "@/lib/pricing";
import { PaymentModal } from "@/app/components/PaymentModal";

interface Agent {
  id: string;
  name: string;
  subscriptionStatus: string;
  subscriptionType: string;
  currentPeriodEnd: string;
  tier: string;
}

interface DashboardData {
  user: {
    id: string;
  };
  agents: Agent[];
}

export default function BillingPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.push("/");
      return;
    }
    if (user) {
      fetchDashboard();
    }
  }, [ready, authenticated, user, router]);

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
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  const openExtendModal = (agent: Agent) => {
    setSelectedAgent(agent);
    // Load pricing options for this agent's tier
    const options = getPricingOptions(agent.tier);
    setPricingOptions(options);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedAgent(null);
    // Refresh dashboard data
    fetchDashboard();
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }} 
          transition={{ duration: 1.5, repeat: Infinity }}
          className="font-mono text-sm text-[var(--muted)]"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (!authenticated) return null;

  const activeAgents = data?.agents.filter(a => a.subscriptionStatus === "active") || [];
  const expiredAgents = data?.agents.filter(a => a.subscriptionStatus === "expired") || [];

  return (
    <div className="min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-80px)] bg-[var(--background)] text-[var(--foreground)]">
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold mb-2">Billing & Settings</h1>
          <p className="text-[var(--muted)]">Manage your subscriptions, payments, and account preferences</p>
        </motion.div>

        <div className="space-y-6">
          {/* Subscription Management */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Your Subscriptions</h2>
                  <p className="text-sm text-[var(--muted)]">Manage and extend your AI agent subscriptions</p>
                </div>
              </div>

              {activeAgents.length === 0 && expiredAgents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[var(--muted)]">No active subscriptions</p>
                  <button 
                    onClick={() => router.push("/")}
                    className="mt-4 px-4 py-2 bg-[var(--accent)] text-white rounded-xl hover:opacity-90"
                  >
                    Create Your First Agent
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active Subscriptions */}
                  {activeAgents.map((agent) => (
                    <div key={agent.id} className="p-5 bg-[var(--background)] rounded-xl border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{agent.name}</h3>
                            <span className="px-2.5 py-0.5 bg-green-500/10 text-green-500 text-xs font-medium rounded-full border border-green-500/20">
                              Active
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Renews {new Date(agent.currentPeriodEnd).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-4 h-4" />
                              {agent.tier === "matt" ? "Matt Plan" : "Pro Plan"}
                            </span>
                          </div>
                        </div>
                        
                        {/* EXTEND Button - Prominent */}
                        <button
                          onClick={() => openExtendModal(agent)}
                          className="group relative px-6 py-3 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[var(--accent)]/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <TrendingDown className="w-4 h-4" />
                          Extend & Save
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Expired Subscriptions */}
                  {expiredAgents.map((agent) => (
                    <div key={agent.id} className="p-5 bg-red-500/5 rounded-xl border border-red-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-lg">{agent.name}</h3>
                            <span className="px-2.5 py-0.5 bg-red-500/10 text-red-500 text-xs font-medium rounded-full border border-red-500/20">
                              Expired
                            </span>
                          </div>
                          <p className="text-sm text-red-500/80">
                            Expired on {new Date(agent.currentPeriodEnd).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => openExtendModal(agent)}
                          className="px-6 py-3 bg-[var(--accent)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                        >
                          Renew Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>

          {/* Pricing Info */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Pricing</h2>
                  <p className="text-sm text-[var(--muted)]">Flexible plans with volume discounts</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Monthly Option */}
                <div className="p-5 border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">Monthly</h3>
                      <p className="text-sm text-[var(--muted)]">Flexible, cancel anytime</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">$150<span className="text-sm font-normal text-[var(--muted)]">/mo</span></p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-[var(--muted)]">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)]" />
                      1 AI agent
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)]" />
                      Full feature access
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)]" />
                      Telegram integration
                    </li>
                  </ul>
                </div>

                {/* Annual Option - Highlighted */}
                <div className="relative p-5 bg-gradient-to-br from-[var(--accent)]/5 to-purple-500/5 border-2 border-[var(--accent)] rounded-xl">
                  <div className="absolute -top-3 left-4">
                    <span className="px-3 py-1 bg-gradient-to-r from-[var(--accent)] to-purple-500 text-white text-xs font-semibold rounded-full">
                      Best Value
                    </span>
                  </div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">Annual</h3>
                      <p className="text-sm text-[var(--muted)]">Save $800/year</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">$1000<span className="text-sm font-normal text-[var(--muted)]">/yr</span></p>
                      <p className="text-sm text-green-500">~$83/mo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3 p-2 bg-green-500/10 rounded-lg">
                    <TrendingDown className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">44% off monthly price</span>
                  </div>
                  <ul className="space-y-2 text-sm text-[var(--muted)]">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)]" />
                      Everything in Monthly
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)]" />
                      Priority support
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--accent)]" />
                      Early access to features
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Payment Methods */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Payment Methods</h2>
                    <p className="text-sm text-[var(--muted)]">Crypto payments via NowPayments</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded flex items-center justify-center text-[8px] text-white font-bold">
                      USDT
                    </div>
                    <div>
                      <p className="font-medium">USDT / USDC</p>
                      <p className="text-xs text-[var(--muted)]">Tron, Ethereum, BSC networks</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </motion.section>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Notification Preferences */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Notifications</h2>
                    <p className="text-sm text-[var(--muted)]">Choose what you want to be notified about</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Billing alerts</p>
                      <p className="text-xs text-[var(--muted)]">Payment confirmations and renewal reminders</p>
                    </div>
                    <div 
                      onClick={() => setEmailNotifications(!emailNotifications)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        emailNotifications ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        emailNotifications ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </div>
                  </label>
                  <div className="h-px bg-[var(--border)]" />
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Marketing emails</p>
                      <p className="text-xs text-[var(--muted)]">Tips, offers, and product updates</p>
                    </div>
                    <div 
                      onClick={() => setMarketingEmails(!marketingEmails)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        marketingEmails ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        marketingEmails ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </div>
                  </label>
                </div>
              </div>
            </motion.section>

            {/* Security Settings */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Security</h2>
                    <p className="text-sm text-[var(--muted)]">Keep your account secure</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Wallet Authentication</p>
                      <p className="text-xs text-[var(--muted)]">Your account is secured by your wallet</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="h-px bg-[var(--border)]" />
                  <div className="p-3 bg-[var(--background)] rounded-lg">
                    <p className="text-xs text-[var(--muted)]">Connected wallet:</p>
                    <p className="text-sm font-mono mt-1 truncate">{user?.wallet?.address || "Not connected"}</p>
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          {/* Danger Zone */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-red-500/5 border border-red-500/20 rounded-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-red-500">Danger Zone</h2>
                  <p className="text-sm text-[var(--muted)]">Irreversible actions</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-xl">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-[var(--muted)]">This will permanently delete all your data</p>
                </div>
                <button className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      {/* Payment Modal - Using shared component */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        config={{ agentName: selectedAgent?.name || "" }}
        sessionId={`extend_${selectedAgent?.id}_${Date.now()}`}
        onSuccess={handlePaymentSuccess}
        mode="extend"
        agentId={selectedAgent?.id}
        userId={data?.user.id}
        pricingOptions={pricingOptions}
      />
    </div>
  );
}
