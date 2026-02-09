"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Settings,
  User,
  Bell,
  Shield,
  Wallet,
  ChevronRight,
  ExternalLink,
  LogOut,
  Loader2
} from "lucide-react";

export default function SettingsPage() {
  const { user, authenticated, ready, logout } = usePrivy();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("profile");

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.push("/");
      return;
    }
    const timer = setTimeout(() => setLoading(false), 300);
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
          <Loader2 className="w-6 h-6 animate-spin" />
        </motion.div>
      </div>
    );
  }

  if (!authenticated) return null;

  const settingsSections = [
    {
      id: "profile",
      label: "Profile",
      icon: User,
      description: "Manage your personal information",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      description: "Email and push notification preferences",
    },
    {
      id: "billing",
      label: "Billing & Plans",
      icon: Wallet,
      description: "Manage subscriptions and payments",
      href: "/billing",
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      description: "Password, 2FA, and account security",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-[var(--accent)]" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-[var(--muted)]">Manage your account and preferences</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              if (section.href) {
                return (
                  <Link
                    key={section.id}
                    href={section.href}
                    className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                      isActive 
                        ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30" 
                        : "hover:bg-[var(--card)] border border-transparent"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${isActive ? "text-[var(--accent)]" : ""}`}>{section.label}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-[var(--muted)]" />
                  </Link>
                );
              }

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                    isActive 
                      ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30" 
                      : "hover:bg-[var(--card)] border border-transparent"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
                  <div className="flex-1">
                    <p className={`font-medium ${isActive ? "text-[var(--accent)]" : ""}`}>{section.label}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "rotate-90" : ""}`} />
                </button>
              );
            })}

            <div className="h-px bg-[var(--border)] my-4" />

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-red-500 hover:bg-red-500/10 transition-all text-left"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </motion.div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2"
          >
            {activeSection === "profile" && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                      <User className="w-8 h-8 text-[var(--accent)]" />
                    </div>
                    <div>
                      <p className="font-medium">{user?.email?.address || "No email set"}</p>
                      <p className="text-sm text-[var(--muted)]">
                        Wallet: {user?.wallet?.address ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}` : "Not connected"}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-[var(--border)]" />

                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input 
                        type="email" 
                        value={user?.email?.address || ""}
                        disabled
                        className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--muted)]"
                      />
                      <p className="text-xs text-[var(--muted)] mt-1">Email is managed through your wallet connection</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Wallet Address</label>
                      <input 
                        type="text" 
                        value={user?.wallet?.address || ""}
                        disabled
                        className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--muted)] font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-xl">
                    <div>
                      <p className="font-medium">Agent Updates</p>
                      <p className="text-sm text-[var(--muted)]">Get notified when your agent status changes</p>
                    </div>
                    <div className="w-11 h-6 bg-[var(--accent)] rounded-full relative">
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-xl">
                    <div>
                      <p className="font-medium">Billing Alerts</p>
                      <p className="text-sm text-[var(--muted)]">Payment confirmations and renewal reminders</p>
                    </div>
                    <div className="w-11 h-6 bg-[var(--accent)] rounded-full relative">
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-xl">
                    <div>
                      <p className="font-medium">Marketing Emails</p>
                      <p className="text-sm text-[var(--muted)]">Tips, offers, and product updates</p>
                    </div>
                    <div className="w-11 h-6 bg-[var(--border)] rounded-full relative">
                      <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "security" && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-6">Security Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-xl">
                    <div>
                      <p className="font-medium">Wallet Authentication</p>
                      <p className="text-sm text-[var(--muted)]">Your account is secured by your wallet signature</p>
                    </div>
                    <span className="px-3 py-1 bg-green-500/10 text-green-500 text-sm rounded-full">
                      Active
                    </span>
                  </div>

                  <div className="p-4 bg-[var(--background)] rounded-xl">
                    <p className="font-medium mb-2">Connected Wallet</p>
                    <p className="text-sm text-[var(--muted)] font-mono">
                      {user?.wallet?.address || "No wallet connected"}
                    </p>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-sm text-amber-500">
                      <strong>Security Note:</strong> Your account is secured through Privy wallet authentication. 
                      Keep your wallet secure and never share your private keys.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
