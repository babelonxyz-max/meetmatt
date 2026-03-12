"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CreditCard,
  Bot,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarDays,
  Receipt,
  ArrowLeft,
  Mail,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BillingAgent {
  id: string;
  name: string;
  subscriptionStatus: string;
  subscriptionType: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  activationStatus: string;
  createdAt: string;
}

interface BillingPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface BillingData {
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
  agents: BillingAgent[];
  payments: BillingPayment[];
  stats: {
    totalAgents: number;
    activeSubscriptions: number;
    expired: number;
    inTrial: number;
  };
}

const statusBadge: Record<string, { bg: string; text: string; icon: LucideIcon; label: string }> = {
  active: { bg: "bg-green-500/10", text: "text-green-500", icon: CheckCircle2, label: "Active" },
  trial: { bg: "bg-amber-500/10", text: "text-amber-500", icon: Clock, label: "Trial" },
  expired: { bg: "bg-red-500/10", text: "text-red-500", icon: AlertCircle, label: "Expired" },
};

const paymentStatusColors: Record<string, string> = {
  confirmed: "text-green-500",
  pending: "text-amber-500",
  failed: "text-red-500",
  partial: "text-orange-500",
};

function getPlanLabel(agent: BillingAgent): string {
  if (agent.subscriptionStatus === "trial") {
    return "1-day trial";
  }

  return agent.subscriptionType === "annual"
    ? "Annual plan ($1,000/yr)"
    : "Monthly plan ($150/mo)";
}

export default function BillingPage() {
  const { authenticated, ready, getAccessToken } = usePrivy();
  const router = useRouter();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.push("/");
      return;
    }

    async function fetchBilling() {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const response = await fetch("/api/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load billing data");
        }

        const result = await response.json();
        setData(result);
      } catch (err: unknown) {
        console.error("[Billing] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to load billing data");
      } finally {
        setLoading(false);
      }
    }

    fetchBilling();
  }, [ready, authenticated, getAccessToken, router]);

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[var(--accent)]" />
          <p className="font-mono text-sm text-[var(--muted)]">Loading billing...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-[var(--muted)] text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:bg-[var(--card)]/80 text-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!authenticated || !data) return null;

  const { agents, payments, stats } = data;
  const totalMonthlySpend = agents
    .filter((a) => a.subscriptionStatus === "active")
    .reduce((sum, a) => sum + (a.subscriptionType === "annual" ? 83 : 150), 0);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">Billing</h1>
          <p className="text-[var(--muted)]">Manage subscriptions and view payment history</p>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <SummaryCard label="Active Agents" value={String(stats.activeSubscriptions)} icon={Bot} color="green" />
          <SummaryCard label="In Trial" value={String(stats.inTrial)} icon={Clock} color="amber" />
          <SummaryCard label="Expired" value={String(stats.expired)} icon={AlertCircle} color="red" />
          <SummaryCard
            label="Monthly Spend"
            value={totalMonthlySpend > 0 ? `~$${totalMonthlySpend}` : "$0"}
            icon={CreditCard}
            color="blue"
          />
        </motion.div>

        <div className="space-y-6">
          {/* Agent Subscriptions */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Agent Subscriptions</h2>
                  <p className="text-sm text-[var(--muted)]">{agents.length} agent{agents.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>

            {agents.length === 0 ? (
              <div className="p-10 text-center">
                <Bot className="w-12 h-12 mx-auto mb-3 text-[var(--muted)]" />
                <h3 className="font-medium text-lg mb-1">No agents yet</h3>
                <p className="text-[var(--muted)]">
                  <Link href="/" className="text-[var(--accent)] hover:underline">
                    Create your first agent
                  </Link>{" "}
                  to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {agents.map((agent) => {
                  const badge = statusBadge[agent.subscriptionStatus] || statusBadge.trial;
                  const BadgeIcon = badge.icon;
                  const periodEnd = agent.currentPeriodEnd
                    ? new Date(agent.currentPeriodEnd)
                    : null;
                  const isExpired = agent.subscriptionStatus === "expired";
                  const isCancelling = agent.cancelAtPeriodEnd && agent.subscriptionStatus === "active";

                  return (
                    <div key={agent.id} className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg truncate">{agent.name}</h3>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                            >
                              <BadgeIcon className="w-3.5 h-3.5" />
                              {badge.label}
                            </span>
                            {isCancelling && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500">
                                Cancels at period end
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[var(--muted)]">
                            <span className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5" />
                              {getPlanLabel(agent)}
                            </span>
                            {periodEnd && (
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {(isExpired ? "Expired" : agent.subscriptionStatus === "trial" ? "Ends" : "Renews")}{" "}
                                {periodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isExpired && (
                            <Link href="/">
                              <button className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity">
                                Renew
                              </button>
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Cancel info */}
                      {agent.subscriptionStatus === "active" && !agent.cancelAtPeriodEnd && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
                          <Mail className="w-3.5 h-3.5" />
                          To cancel, contact support at support@meetmatt.xyz
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>

          {/* Payment History */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Payment History</h2>
                  <p className="text-sm text-[var(--muted)]">Your recent transactions</p>
                </div>
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="p-10 text-center">
                <Receipt className="w-12 h-12 mx-auto mb-3 text-[var(--muted)]" />
                <h3 className="font-medium text-lg mb-1">No payments yet</h3>
                <p className="text-[var(--muted)]">Payments will appear here after your first transaction.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {/* Table header */}
                <div className="px-6 py-3 grid grid-cols-4 gap-4 text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  <span>Date</span>
                  <span>Amount</span>
                  <span>Currency</span>
                  <span className="text-right">Status</span>
                </div>

                {payments.map((payment) => (
                  <div key={payment.id} className="px-6 py-4 grid grid-cols-4 gap-4 items-center text-sm">
                    <span className="text-[var(--muted)]">
                      {new Date(payment.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="font-medium">${payment.amount.toFixed(2)}</span>
                    <span className="text-[var(--muted)] uppercase">{payment.currency}</span>
                    <span className={`text-right font-medium capitalize ${paymentStatusColors[payment.status] || "text-[var(--muted)]"}`}>
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Payment Methods */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Payment Methods</h2>
                  <p className="text-sm text-[var(--muted)]">Cards via Dodo Payments, crypto via NowPayments</p>
                </div>
              </div>

              <div className="p-4 border border-[var(--border)] rounded-xl">
                <p className="text-sm text-[var(--muted)]">
                  Payments are processed per-agent at deployment time using hosted card checkout or supported
                  crypto rails including USDT and USDC. No saved payment method is required on our side.
                </p>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    amber: "bg-amber-500/10 text-amber-500",
    red: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
