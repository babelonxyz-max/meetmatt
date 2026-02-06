"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Zap, Sparkles, Clock, TrendingDown, Users, Award, Bot } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const features = [
  "Live Build Viewing",
  "Devin AI Powered", 
  "Deploy Anywhere",
  "1 Month Included",
];

const comparisonData = [
  { metric: "Monthly Cost", matt: "$150 flat", agency: "$5,000-15,000/mo" },
  { metric: "Setup Time", matt: "15 minutes", agency: "2-4 weeks" },
  { metric: "Response Time", matt: "< 1 minute", agency: "2-4 hours" },
  { metric: "Availability", matt: "24/7/365", agency: "Business hours only" },
  { metric: "API Integrations", matt: "Unlimited", agency: "$500+ per integration" },
];

const trustBadges = [
  { icon: Bot, label: "Devin AI Powered", desc: "World's best AI engineer" },
  { icon: Clock, label: "15-min Deploy", desc: "From idea to live agent" },
  { icon: TrendingDown, label: "60% Less Email", desc: "Automated responses" },
  { icon: Users, label: "500+ Founders", desc: "Already using Matt" },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  
  const monthlyPrice = 150;
  const annualPrice = 1000;

  return (
    <div className="pt-14">
      {/* Hero Pricing Section - Compact */}
      <section className="py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-6"
          >
            <div className="inline-flex items-center gap-2 p-1 rounded-full bg-[var(--card)] border border-[var(--border)]">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  !isAnnual 
                    ? "bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white shadow-lg" 
                    : "text-[var(--muted)]"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  isAnnual 
                    ? "bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white shadow-lg" 
                    : "text-[var(--muted)]"
                }`}
              >
                Annual
                <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full font-bold">
                  -44%
                </span>
              </button>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Left - Main Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-[var(--accent)] text-xs font-mono mb-2 tracking-wider">
                PRICING_MODULE_v2.1
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={isAnnual ? "annual" : "monthly"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {isAnnual ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-6xl sm:text-7xl font-bold leading-none">$83</span>
                        <span className="text-lg text-[var(--muted)]">/mo</span>
                      </div>
                      <p className="text-sm text-green-400 mt-1">
                        Billed annually at ${annualPrice}/year
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-7xl sm:text-8xl font-bold leading-none">$5</span>
                        <span className="text-xl text-[var(--muted)]">/day</span>
                      </div>
                      <p className="text-[var(--muted)] mt-1">
                        Your own AI agent. Deployed in minutes.
                      </p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
              
              <div className="flex items-center gap-3 my-4">
                <span className="text-[var(--muted)] line-through text-sm">$250</span>
                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-mono">
                  SAVE 40%
                </span>
                <span className="text-[var(--foreground)] font-medium text-sm">$150 one-time setup</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group px-6 py-3 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] rounded-xl font-semibold flex items-center gap-2 text-white text-sm"
                  >
                    <Zap className="w-4 h-4" />
                    DEPLOY NOW
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            {/* Right - Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-3"
            >
              <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                <div className="text-2xl font-bold text-[var(--accent)]">15min</div>
                <div className="text-xs text-[var(--muted)] font-mono">AVG BUILD</div>
              </div>
              <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                <div className="text-2xl font-bold text-[var(--accent)]">24/7</div>
                <div className="text-xs text-[var(--muted)] font-mono">AVAILABILITY</div>
              </div>
              <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                <div className="text-2xl font-bold text-[var(--accent)]">&lt;60s</div>
                <div className="text-xs text-[var(--muted)] font-mono">RESPONSE</div>
              </div>
              <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
                <div className="text-2xl font-bold text-[var(--accent)]">100+</div>
                <div className="text-xs text-[var(--muted)] font-mono">LANGUAGES</div>
              </div>
            </motion.div>
          </div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 pt-4 border-t border-[var(--border)] flex flex-wrap justify-center gap-6"
          >
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-[var(--muted)]">
                <Check className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 bg-[var(--card)]/30 border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {trustBadges.map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                  <badge.icon className="w-4 h-4 text-[var(--accent)]" />
                </div>
                <div>
                  <div className="text-sm font-medium">{badge.label}</div>
                  <div className="text-xs text-[var(--muted)]">{badge.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <h2 className="text-2xl font-bold mb-1">MATT vs AGENCY</h2>
            <p className="text-[var(--muted)] text-sm">Why founders choose Matt</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[var(--card)]/50 border border-[var(--border)] rounded-xl overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-4 p-3 border-b border-[var(--border)] bg-[var(--card)] font-medium text-sm">
              <div className="text-[var(--muted)]">Metric</div>
              <div className="text-[var(--accent)] flex items-center gap-1">
                MATT
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="text-[var(--muted)]">Agency</div>
            </div>
            {comparisonData.map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-3 gap-4 p-3 border-b border-[var(--border)]/50 hover:bg-[var(--card)]/30 text-sm"
              >
                <div className="text-[var(--foreground)]">{row.metric}</div>
                <div className="text-[var(--foreground)] font-medium">{row.matt}</div>
                <div className="text-[var(--muted)] text-xs sm:text-sm">{row.agency}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* ROI Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-6 grid grid-cols-3 gap-3"
          >
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-green-400">$8,400</div>
              <div className="text-xs text-[var(--muted)]">Annual savings</div>
            </div>
            <div className="bg-gradient-to-br from-[var(--accent)]/10 to-purple-500/10 border border-[var(--accent)]/20 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-[var(--accent)]">624 hrs</div>
              <div className="text-xs text-[var(--muted)]">Time saved</div>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-amber-400">28x</div>
              <div className="text-xs text-[var(--muted)]">ROI</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold mb-2">
              Ready to save 12+ hours per week?
            </h2>
            <p className="text-[var(--muted)] text-sm mb-6">
              Join founders who deploy AI agents in minutes, not months.
            </p>
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] rounded-xl font-semibold inline-flex items-center gap-2 text-white text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Start Building Now
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <p className="mt-4 text-xs text-[var(--muted)]">
              {isAnnual 
                ? `$${annualPrice}/year (save $800) • $150 setup` 
                : `$150 first month • $150/mo after`}
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
