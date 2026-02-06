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
  { metric: "Monthly Cost", matt: "$150 flat", agency: "$5,000-15,000/mo", source: "Industry data" },
  { metric: "Setup Time", matt: "15 minutes", agency: "2-4 weeks", source: "Project timeline" },
  { metric: "Response Time", matt: "< 1 minute", agency: "2-4 hours", source: "SLA comparison" },
  { metric: "Availability", matt: "24/7/365", agency: "Business hours only", source: "Operating hours" },
  { metric: "Max Concurrent Tasks", matt: "Unlimited", agency: "Limited by staff", source: "Capacity" },
  { metric: "Languages Supported", matt: "100+", agency: "3-5 typical", source: "Language coverage" },
  { metric: "Setup Fee", matt: "$150", agency: "$2,000-5,000", source: "Initial cost" },
  { metric: "API Integrations", matt: "Unlimited", agency: "$500+ per integration", source: "Dev costs" },
];

const useCases = [
  { title: "Customer Support", hours: "15 hrs/week", icon: "🎧", desc: "Instant responses" },
  { title: "Lead Qualification", hours: "10 hrs/week", icon: "🎯", desc: "Auto-enrichment" },
  { title: "Scheduling", hours: "8 hrs/week", icon: "📅", desc: "Calendar sync" },
  { title: "Data Entry", hours: "12 hrs/week", icon: "📊", desc: "Workflow automation" },
];

const moreStats = [
  { label: "First Response", value: "< 60s", vs: "4+ hours (typical)" },
  { label: "Uptime SLA", value: "99.9%", vs: "95% (standard)" },
  { label: "Concurrent Users", value: "Unlimited", vs: "Limited by agents" },
  { label: "Cost Per Task", value: "$0.02", vs: "$2.50 (manual)" },
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
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden pt-16 sm:pt-20">
      {/* Hero Pricing Section */}
      <section className="py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-[var(--muted)]">Deploy AI agents for less than a cup of coffee per day</p>
        </div>
        <div className="max-w-6xl mx-auto">
          {/* Billing Toggle - Fixed Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--card)] border border-[var(--border)]">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 min-w-[90px] ${
                  !isAnnual 
                    ? "bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white shadow-lg" 
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 min-w-[90px] ${
                  isAnnual 
                    ? "bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white shadow-lg" 
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Annual
                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-bold">
                  -44%
                </span>
              </button>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Left - Main Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="text-[var(--accent)] text-sm font-mono mb-3 tracking-wider">
                PRICING_MODULE_v2.1
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={isAnnual ? "annual" : "monthly"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {isAnnual ? (
                    <>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-[90px] sm:text-[120px] font-bold leading-none tracking-tighter">
                          $83
                        </span>
                        <span className="text-xl sm:text-2xl text-[var(--muted)]">/mo</span>
                      </div>
                      <p className="text-base text-green-400 mb-4">
                        Billed annually at ${annualPrice}/year
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-[100px] sm:text-[160px] font-bold leading-none tracking-tighter">
                          $5
                        </span>
                        <span className="text-2xl sm:text-3xl text-[var(--muted)]">/day</span>
                      </div>
                      <p className="text-lg sm:text-xl text-[var(--muted)] mb-4">
                        Your own AI agent. Deployed in minutes.
                      </p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
              
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[var(--muted)] line-through">$250 setup</span>
                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-sm font-mono">
                  SAVE 40%
                </span>
                <span className="text-[var(--foreground)] font-medium">$150 one-time</span>
              </div>

              <Link href="/">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative px-8 py-4 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] rounded-xl font-semibold text-lg flex items-center gap-3 overflow-hidden text-white"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                  <Zap className="w-5 h-5" />
                  DEPLOY NOW
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
            </motion.div>

            {/* Right - Stats Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-[var(--card)]/50 border border-[var(--border)] rounded-2xl p-5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-mono text-[var(--muted)]">SYSTEM ONLINE</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={isAnnual ? "annual-stats" : "monthly-stats"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 gap-3 mb-4"
                >
                  {isAnnual ? (
                    <>
                      <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-xl sm:text-2xl font-bold text-[var(--accent)]">$83</div>
                        <div className="text-xs text-[var(--muted)] font-mono mt-1">PER MO</div>
                      </div>
                      <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-xl sm:text-2xl font-bold text-green-400">$800</div>
                        <div className="text-xs text-[var(--muted)] font-mono mt-1">SAVED/YR</div>
                      </div>
                      <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-xl sm:text-2xl font-bold text-[var(--accent)]">15min</div>
                        <div className="text-xs text-[var(--muted)] font-mono mt-1">AVG BUILD</div>
                      </div>
                      <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-xl sm:text-2xl font-bold text-[var(--accent)]">24/7</div>
                        <div className="text-xs text-[var(--muted)] font-mono mt-1">AVAILABILITY</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-xl sm:text-2xl font-bold text-[var(--accent)]">15min</div>
                        <div className="text-xs text-[var(--muted)] font-mono mt-1">AVG BUILD</div>
                      </div>
                      <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-xl sm:text-2xl font-bold text-[var(--accent)]">24/7</div>
                        <div className="text-xs text-[var(--muted)] font-mono mt-1">AVAILABILITY</div>
                      </div>
                      <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-xl sm:text-2xl font-bold text-[var(--accent)]">1mo</div>
                        <div className="text-xs text-[var(--muted)] font-mono mt-1">INCLUDED</div>
                      </div>
                      <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
                        <div className="text-xl sm:text-2xl font-bold text-[var(--accent)]">$5</div>
                        <div className="text-xs text-[var(--muted)] font-mono mt-1">PER DAY</div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="pt-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">
                    {isAnnual ? "Annual billing:" : "Monthly recurring:"}
                  </span>
                  <span className="text-[var(--accent)] font-mono">
                    {isAnnual ? `$${annualPrice}/year` : `$${monthlyPrice}/mo`}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 pt-6 border-t border-[var(--border)]"
          >
            <div className="flex flex-wrap justify-center gap-6">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-[var(--muted)]">
                  <Check className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-[var(--card)]/30 border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {trustBadges.map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                  <badge.icon className="w-5 h-5 text-[var(--accent)]" />
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

      {/* More Stats Section */}
      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Performance Metrics</h2>
            <p className="text-[var(--muted)]">Real results from Matt deployments</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {moreStats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 text-center"
              >
                <div className="text-3xl font-bold text-[var(--accent)] mb-2">{stat.value}</div>
                <div className="text-sm font-medium mb-1">{stat.label}</div>
                <div className="text-xs text-[var(--muted)]">vs {stat.vs}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* VS Agency Comparison */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[var(--card)]/20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">MATT vs AGENCY</h2>
            <p className="text-[var(--muted)]">Data-driven comparison for decision makers</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-[var(--card)]/50 border border-[var(--border)] rounded-2xl overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-[var(--border)] bg-[var(--card)] font-medium text-sm">
              <div className="text-[var(--muted)]">Metric</div>
              <div className="text-[var(--accent)] flex items-center gap-1">
                MATT
                <Award className="w-4 h-4" />
              </div>
              <div className="text-[var(--muted)]">Traditional Agency</div>
            </div>
            {comparisonData.map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-3 gap-4 p-4 border-b border-[var(--border)]/50 hover:bg-[var(--card)]/30 transition-colors text-sm"
              >
                <div className="text-[var(--foreground)]">
                  {row.metric}
                  <span className="block text-xs text-[var(--muted)] mt-0.5">{row.source}</span>
                </div>
                <div className="text-[var(--foreground)] font-semibold">{row.matt}</div>
                <div className="text-[var(--muted)]">{row.agency}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* ROI Highlight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-8 grid sm:grid-cols-3 gap-4"
          >
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">$8,400</div>
              <div className="text-sm text-[var(--muted)]">Average annual savings</div>
            </div>
            <div className="bg-gradient-to-br from-[var(--accent)]/10 to-purple-500/10 border border-[var(--accent)]/20 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-[var(--accent)] mb-1">624 hrs</div>
              <div className="text-sm text-[var(--muted)]">Time saved per year</div>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-amber-400 mb-1">28x</div>
              <div className="text-sm text-[var(--muted)]">Return on investment</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Automate Any Workflow</h2>
            <p className="text-[var(--muted)]">Hours saved per week by use case</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {useCases.map((useCase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 text-center hover:border-[var(--accent)]/50 transition-all duration-300"
              >
                <div className="text-3xl mb-3">{useCase.icon}</div>
                <h3 className="font-semibold mb-1 text-sm">{useCase.title}</h3>
                <p className="text-xs text-[var(--muted)] mb-2">{useCase.desc}</p>
                <div className="text-[var(--accent)] font-mono text-sm font-medium">{useCase.hours}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[var(--card)]/20 to-[var(--background)]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to save 12+ hours per week?
            </h2>
            <p className="text-[var(--muted)] mb-8 text-lg max-w-xl mx-auto">
              Join founders who deploy AI agents in minutes, not months.
            </p>
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] rounded-xl font-semibold text-lg inline-flex items-center gap-3 text-white"
              >
                <Sparkles className="w-5 h-5" />
                Start Building Now
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <p className="mt-4 text-sm text-[var(--muted)]">
              {isAnnual 
                ? `$${annualPrice}/year (save $800) • $150 one-time setup` 
                : `$150 first month • $150/mo after`}
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
