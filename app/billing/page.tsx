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
  Check,
  Wallet,
} from "lucide-react";

export default function BillingPage() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.push("/");
      return;
    }
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [ready, authenticated, router]);

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

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Billing & Settings</h1>
          <p className="text-[var(--muted)]">Manage your subscription, payments, and account preferences</p>
        </motion.div>

        <div className="space-y-6">
          {/* Current Plan Section */}
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
                  <h2 className="text-lg font-semibold">Current Plan</h2>
                  <p className="text-sm text-[var(--muted)]">Manage your subscription</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {/* Free Plan */}
                <div className="p-5 rounded-xl border-2 border-[var(--border)] relative">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Free</h3>
                  </div>
                  <p className="text-2xl font-bold mb-1">$0<span className="text-sm font-normal text-[var(--muted)]">/mo</span></p>
                  <p className="text-xs text-[var(--muted)]">1 agent, basic features</p>
                  <span className="mt-2 inline-block px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded-full">Coming Soon</span>
                </div>

                {/* Monthly Plan */}
                <div className="p-5 rounded-xl border-2 border-[var(--accent)] bg-[var(--accent)]/5 relative">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Monthly</h3>
                    <Check className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <p className="text-2xl font-bold mb-1">$150<span className="text-sm font-normal text-[var(--muted)]">/mo</span></p>
                  <p className="text-xs text-[var(--muted)]">Unlimited agents, full features</p>
                </div>

                {/* Annual Plan */}
                <div className="p-5 rounded-xl border-2 border-[var(--border)] relative">
                  <div className="absolute -top-3 right-3">
                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded-full">
                      Save $800
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Annual</h3>
                  </div>
                  <p className="text-2xl font-bold mb-1">$1000<span className="text-sm font-normal text-[var(--muted)]">/yr</span></p>
                  <p className="text-xs text-[var(--muted)]">~$83/mo, best value</p>
                  <span className="mt-2 inline-block px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded-full">Coming Soon</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-xl">
                <div>
                  <p className="font-medium">Billing</p>
                  <p className="text-sm text-[var(--muted)]">Per-agent pricing via crypto payment</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Payment Methods */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
                    <p className="text-sm text-[var(--muted)]">Cryptocurrency payments via NowPayments</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-[var(--border)] rounded-xl text-center">
                <p className="text-sm text-[var(--muted)]">Payments are processed per-agent at deployment time using USDT, USDC, and other supported cryptocurrencies.</p>
              </div>
            </div>
          </motion.section>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Notification Preferences */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
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
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Email notifications</p>
                      <p className="text-xs text-[var(--muted)]">Receive updates about your agents</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded-full">Coming Soon</span>
                  </div>
                  <div className="h-px bg-[var(--border)]" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Marketing emails</p>
                      <p className="text-xs text-[var(--muted)]">Tips, offers, and product updates</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded-full">Coming Soon</span>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Security Settings */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
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
                      <p className="text-sm font-medium">Two-factor authentication</p>
                      <p className="text-xs text-[var(--muted)]">Add an extra layer of security</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded-full">Coming Soon</span>
                  </div>
                  <div className="h-px bg-[var(--border)]" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Change password</p>
                      <p className="text-xs text-[var(--muted)]">Update your account password</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded-full">Coming Soon</span>
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          {/* Danger Zone */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
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
                <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded-full">Coming Soon</span>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
