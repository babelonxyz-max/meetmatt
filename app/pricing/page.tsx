"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Zap, Clock, Shield, Sparkles } from "lucide-react";
import Link from "next/link";

const stats = [
  { value: "15min", label: "AVG BUILD" },
  { value: "24/7", label: "AVAILABILITY" },
  { value: "1mo", label: "INCLUDED" },
  { value: "$5", label: "PER DAY" },
];

const features = [
  "Live Build Viewing",
  "Devin AI Powered", 
  "Deploy Anywhere",
  "1 Month Included",
];

const comparisonData = [
  { metric: "Cost (Monthly)", matt: "$150 + $50/mo", agency: "$5,000-15,000/mo" },
  { metric: "Setup Time", matt: "15 minutes", agency: "2-4 weeks" },
  { metric: "Time Saved/Week", matt: "12+ hours", agency: "N/A" },
  { metric: "Email Reduction", matt: "60% less", agency: "Variable" },
  { metric: "Scheduling Speed", matt: "70% faster", agency: "Standard" },
  { metric: "Availability", matt: "24/7", agency: "Business hours" },
  { metric: "Customization", matt: "Unlimited", agency: "Limited" },
];

const useCases = [
  { title: "Customer Support", hours: "15 hrs/week saved", icon: "🎧" },
  { title: "Lead Qualification", hours: "10 hrs/week saved", icon: "🎯" },
  { title: "Appointment Scheduling", hours: "8 hrs/week saved", icon: "📅" },
  { title: "Data Entry", hours: "12 hrs/week saved", icon: "📊" },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">MATT</span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-zinc-400 hover:text-white transition-colors">SYSTEM</Link>
              <Link href="#" className="text-zinc-400 hover:text-white transition-colors">TERMS</Link>
              <Link href="#" className="text-zinc-400 hover:text-white transition-colors">PRIVACY</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Pricing Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Main Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-[#0ea5e9] text-sm font-mono mb-4 tracking-wider">
                PRICING_MODULE_v2.1
              </div>
              
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-[120px] sm:text-[180px] font-bold leading-none tracking-tighter">
                  $5
                </span>
                <span className="text-2xl sm:text-3xl text-zinc-400">/day</span>
              </div>
              
              <p className="text-xl sm:text-2xl text-zinc-300 mb-6">
                Your own AI agent. Deployed in minutes.
              </p>
              
              <div className="flex items-center gap-3 mb-8">
                <span className="text-zinc-500 line-through">$250 setup</span>
                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-sm font-mono">
                  SAVE 40%
                </span>
                <span className="text-white font-medium">$150 one-time</span>
              </div>

              <Link href="/">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative px-8 py-4 bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] rounded-xl font-semibold text-lg flex items-center gap-3 overflow-hidden"
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
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-mono text-zinc-400">SYSTEM ONLINE</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="text-2xl sm:text-3xl font-bold text-[#0ea5e9]">{stat.value}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">After first month:</span>
                  <span className="text-[#0ea5e9] font-mono">$50/mo Care Plan</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 pt-8 border-t border-zinc-800"
          >
            <div className="flex flex-wrap justify-center gap-8">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-zinc-400">
                  <Check className="w-4 h-4 text-[#0ea5e9]" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* VS Agency Comparison */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-950">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">MATT vs AGENCY</h2>
            <p className="text-zinc-400">See why founders choose Matt over traditional agencies</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-zinc-800 bg-zinc-900/80 font-medium text-sm">
              <div className="text-zinc-400">Metric</div>
              <div className="text-[#0ea5e9]">MATT</div>
              <div className="text-zinc-500">Agency</div>
            </div>
            {comparisonData.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-3 gap-4 p-4 border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
              >
                <div className="text-zinc-300 text-sm">{row.metric}</div>
                <div className="text-white font-medium">{row.matt}</div>
                <div className="text-zinc-500">{row.agency}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Use Cases - Time Saved */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Real Results</h2>
            <p className="text-zinc-400">Hours saved per week by use case</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center hover:border-[#0ea5e9]/50 transition-colors"
              >
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="font-semibold mb-2">{useCase.title}</h3>
                <div className="text-[#0ea5e9] font-mono text-sm">{useCase.hours}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center"
          >
            <div className="inline-flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
              <div className="text-6xl font-bold text-[#0ea5e9]">60%</div>
              <div className="text-left">
                <div className="text-xl font-semibold">Less Email</div>
                <div className="text-zinc-400">Average reduction in inbox volume</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-zinc-950 to-[#0a0a0b]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to save 12+ hours per week?
            </h2>
            <p className="text-zinc-400 mb-8 text-lg">
              Join founders who deploy AI agents in minutes, not months.
            </p>
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] rounded-xl font-semibold text-lg inline-flex items-center gap-3"
              >
                <Sparkles className="w-5 h-5" />
                Start Building Now
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <p className="mt-4 text-sm text-zinc-500">
              $150 setup • First month included • $50/mo after
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium">MATT</span>
          </div>
          <div className="text-sm text-zinc-500">
            © 2026 Meet Matt. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
