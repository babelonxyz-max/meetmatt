"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/app/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { 
  CreditCard, 
  Bell, 
  Shield, 
  Trash2,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Wallet,
  Settings,
  ChevronRight
} from "lucide-react";

export default function BillingPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<"free" | "monthly" | "annual">("monthly");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

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
      <Navbar />
      
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
                <div 
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    plan === "free" 
                      ? "border-[var(--accent)] bg-[var(--accent)]/5" 
                      : "border-[var(--border)] hover:border-[var(--accent)]/50"
                  }`}
                  onClick={() => setPlan("free")}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Free</h3>
                    {plan === "free" && <Check className="w-5 h-5 text-[var(--accent)]" />}
                  </div>
                  <p className="text-2xl font-bold mb-1">$0<span className="text-sm font-normal text-[var(--muted)]">/mo</span></p>
                  <p className="text-xs text-[var(--muted)]">1 agent, basic features</p>
                </div>

                {/* Monthly Plan */}
                <div 
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all relative ${
                    plan === "monthly" 
                      ? "border-[var(--accent)] bg-[var(--accent)]/5" 
                      : "border-[var(--border)] hover:border-[var(--accent)]/50"
                  }`}
                  onClick={() => setPlan("monthly")}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Monthly</h3>
                    {plan === "monthly" && <Check className="w-5 h-5 text-[var(--accent)]" />}
                  </div>
                  <p className="text-2xl font-bold mb-1">$150<span className="text-sm font-normal text-[var(--muted)]">/mo</span></p>
                  <p className="text-xs text-[var(--muted)]">Unlimited agents, full features</p>
                </div>

                {/* Annual Plan */}
                <div 
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all relative ${
                    plan === "annual" 
                      ? "border-[var(--accent)] bg-[var(--accent)]/5" 
                      : "border-[var(--border)] hover:border-[var(--accent)]/50"
                  }`}
                  onClick={() => setPlan("annual")}
                >
                  <div className="absolute -top-3 right-3">
                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded-full">
                      Save $800
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Annual</h3>
                    {plan === "annual" && <Check className="w-5 h-5 text-[var(--accent)]" />}
                  </div>
                  <p className="text-2xl font-bold mb-1">$1000<span className="text-sm font-normal text-[var(--muted)]">/yr</span></p>
                  <p className="text-xs text-[var(--muted)]">~$83/mo, best value</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-xl">
                <div>
                  <p className="font-medium">Current billing cycle</p>
                  <p className="text-sm text-[var(--muted)]">Renews on March 15, 2025</p>
                </div>
                <Button variant="outline" className="border-[var(--border)]">
                  View Invoice
                </Button>
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
                    <p className="text-sm text-[var(--muted)]">Manage your payment options</p>
                  </div>
                </div>
                <Button className="bg-[var(--accent)] hover:bg-[var(--accent)]/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Method
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded flex items-center justify-center text-[8px] text-white font-bold">
                      USDH
                    </div>
                    <div>
                      <p className="font-medium">USDH (HyperEVM)</p>
                      <p className="text-xs text-[var(--muted)]">Connected wallet: 0x7a23...45f2</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-full">
                    Default
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
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Email notifications</p>
                      <p className="text-xs text-[var(--muted)]">Receive updates about your agents</p>
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
                    <Button variant="outline" size="sm" className="border-[var(--border)]">
                      Enable
                    </Button>
                  </div>
                  <div className="h-px bg-[var(--border)]" />
                  <Button variant="outline" className="w-full border-[var(--border)]">
                    Change Password
                  </Button>
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
                <Button 
                  variant="destructive"
                >
                  Delete
                </Button>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
