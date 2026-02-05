"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Check, 
  ChevronDown, 
  Zap, 
  Shield, 
  Clock, 
  Cpu, 
  Terminal,
  Sparkles,
  ArrowRight,
  Bot,
  Globe,
  Lock,
  Eye,
  Radio,
  Mail,
  Calendar,
  TrendingUp,
  Users,
  FileText,
  MessageSquare,
  Timer
} from "lucide-react";

const SETUP_PRICE = 150;
const DAILY_PRICE = 5;
const MONTHLY_PRICE = 150;
const ORIGINAL_PRICE = 250;

const features = [
  { icon: Bot, label: "Custom AI Agent", desc: "Built for your exact workflow" },
  { icon: Eye, label: "Live Build Viewing", desc: "Watch Devin work in real-time" },
  { icon: Globe, label: "Deploy Anywhere", desc: "Cloud or self-hosted" },
  { icon: Clock, label: "15-30 Min Build", desc: "From chat to deployed" },
  { icon: Cpu, label: "Devin AI Powered", desc: "World-class AI engineer" },
  { icon: Radio, label: "1 Month Included", desc: "Full support & monitoring" },
  { icon: Lock, label: "Enterprise Security", desc: "Bank-grade encryption" },
  { icon: Shield, label: "Ongoing Care", desc: `$${MONTHLY_PRICE}/mo after first month` },
];

// AI Assistant Benefits - realistic/conservative estimates
const aiBenefits = [
  { icon: Mail, stat: "60%", label: "Less Email Time", desc: "AI drafts replies, sorts priority, handles routine" },
  { icon: Calendar, stat: "70%", label: "Faster Scheduling", desc: "Automated booking, rescheduling, conflict resolution" },
  { icon: Users, stat: "2x", label: "More Follow-ups", desc: "Consistent outreach without forgetting" },
  { icon: FileText, stat: "50%", label: "Faster Docs", desc: "Auto-summarize, generate reports, take notes" },
  { icon: MessageSquare, stat: "24/7", label: "Coverage", desc: "Handle inquiries while you focus" },
  { icon: Timer, stat: "12hrs", label: "Saved Weekly", desc: "Reclaim almost 1.5 workdays per week" },
];

const comparisonFeatures = [
  { feature: "Custom AI Agent", matt: true, agency: true, freelancer: true },
  { feature: "Time to Delivery", matt: "15-30 min", agency: "2-4 weeks", freelancer: "1-2 weeks" },
  { feature: "First Year Total", matt: `$${SETUP_PRICE + MONTHLY_PRICE * 11}`, agency: "$25,000+", freelancer: "$15,000+" },
  { feature: "Live Build Viewing", matt: true, agency: false, freelancer: false },
  { feature: "Monthly Updates", matt: `$${MONTHLY_PRICE}/mo`, agency: "$500+/mo", freelancer: "$200+/hr" },
  { feature: "Response Time", matt: "24/7 instant", agency: "business hours", freelancer: "varies" },
  { feature: "Deploy Anywhere", matt: true, agency: "locked in", freelancer: "varies" },
  { feature: "Scalability", matt: "Unlimited", agency: "Extra $$", freelancer: "Limited" },
];

const faqs = [
  {
    q: "What exactly do I get?",
    a: `A fully functional AI agent custom-built for your needs, deployed to your infrastructure, with one month of full support included. After the first month, ongoing care is available for $${MONTHLY_PRICE}/month.`
  },
  {
    q: "How fast is the build?",
    a: "Most agents are ready in 15-30 minutes. You'll receive a live link to watch Devin AI build your agent in real-time. Complex agents may take up to an hour."
  },
  {
    q: "What about after the first month?",
    a: `After your included first month, you can continue with our Care Plan at $${MONTHLY_PRICE}/month for ongoing monitoring, updates, priority support, and feature additions.`
  },
  {
    q: "Is this really worth $${MONTHLY_PRICE}/month?",
    a: `Conservative estimates show 12 hours saved weekly. At $50/hr value, that's $2,400/month worth of work for $150. Even if you value your time at just $20/hr, you're saving $960/month.`
  },
  {
    q: "Can I see it being built?",
    a: "Yes! You'll get a live Devin AI session link to watch your agent being constructed in real-time. It's like having a window into the engineer's workspace."
  },
];

function FAQItem({ q, a, isOpen, onClick }: { q: string; a: string; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="border-b border-[#0ea5e9]/20">
      <button onClick={onClick} className="w-full py-4 flex items-center justify-between text-left group">
        <span className="text-sm text-[var(--foreground)] group-hover:text-[#0ea5e9] transition-colors pr-4">
          {q}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-[#0ea5e9]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="pb-4 text-sm text-[var(--muted)] leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CountUp({ end, duration = 2, prefix = "", suffix = "" }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const increment = end / (duration * 60);
          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 1000 / 60);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

// Countdown timer for limited offer
function OfferTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 42 });
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-1 text-xs font-mono">
      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">{String(timeLeft.hours).padStart(2, '0')}</span>
      <span className="text-red-400">:</span>
      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">{String(timeLeft.minutes).padStart(2, '0')}</span>
      <span className="text-red-400">:</span>
      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">{String(timeLeft.seconds).padStart(2, '0')}</span>
    </div>
  );
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden">
      {/* Holographic Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #0ea5e9 1px, transparent 1px),
              linear-gradient(to bottom, #0ea5e9 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(14, 165, 233, 0.15) 0%, transparent 50%)`,
          }}
        />
      </div>

      {/* Limited Time Banner */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-gradient-to-r from-red-600/90 via-red-500/90 to-red-600/90 text-white py-1.5">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-3 text-xs sm:text-sm">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium">LIMITED TIME: ${SETUP_PRICE} setup (was $${ORIGINAL_PRICE})</span>
          <span className="hidden sm:inline text-red-200">|</span>
          <span className="hidden sm:inline text-red-100">Offer ends in:</span>
          <OfferTimer />
        </div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="w-8 h-8 rounded bg-gradient-to-br from-[#0ea5e9] to-purple-600 flex items-center justify-center"
            >
              <Zap className="w-4 h-4 text-white" />
            </motion.div>
            <span className="font-mono text-sm tracking-wider">MATT</span>
          </Link>
          <nav className="flex items-center gap-6 text-xs font-mono">
            <Link href="/" className="text-[var(--muted)] hover:text-[#0ea5e9] transition-colors">
              SYSTEM
            </Link>
            <Link href="/terms" className="text-[var(--muted)] hover:text-[#0ea5e9] transition-colors">
              TERMS
            </Link>
            <Link href="/privacy" className="text-[var(--muted)] hover:text-[#0ea5e9] transition-colors">
              PRIVACY
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 pt-[5.5rem]">
        {/* COMPACT HERO */}
        <section ref={heroRef} className="min-h-[calc(100vh-7rem)] flex flex-col">
          <div className="flex-1 flex items-center">
            <div className="max-w-6xl mx-auto px-4 py-6 w-full">
              <div className="grid lg:grid-cols-5 gap-8 items-center">
                {/* Left - Big $5 Message */}
                <div className="lg:col-span-3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#0ea5e9]/50" />
                      <span className="text-xs font-mono text-[#0ea5e9]">PRICING_MODULE_v2.2</span>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#0ea5e9]/50" />
                    </div>

                    {/* THE BIG $5 */}
                    <div className="mb-1">
                      <span className="text-[7rem] sm:text-[9rem] lg:text-[11rem] font-bold leading-none bg-gradient-to-br from-white via-white to-neutral-400 bg-clip-text text-transparent">
                        ${DAILY_PRICE}
                      </span>
                      <span className="text-xl sm:text-2xl text-[var(--muted)] ml-2">/day</span>
                    </div>
                    
                    <p className="text-lg sm:text-xl text-[var(--muted)] mb-3">
                      Your 24/7 AI assistant. Less than a coffee.
                    </p>

                    {/* Pricing Details */}
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                      <span className="text-sm text-[var(--muted)] line-through decoration-red-500/50">${ORIGINAL_PRICE} setup</span>
                      <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-mono font-bold">SAVE 40%</span>
                      <span className="text-base font-medium">${SETUP_PRICE} today</span>
                      <span className="text-[var(--muted)]">+</span>
                      <span className="text-sm">${MONTHLY_PRICE}/mo care</span>
                    </div>

                    {/* CTA */}
                    <Link href="/" className="inline-block">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-8 py-4 bg-gradient-to-r from-[#0ea5e9] to-purple-600 hover:from-[#0284c7] hover:to-purple-700 text-white rounded-lg font-semibold text-lg shadow-lg shadow-[#0ea5e9]/25 flex items-center gap-2"
                      >
                        <Zap className="w-5 h-5" />
                        CLAIM OFFER
                        <ArrowRight className="w-5 h-5" />
                      </motion.button>
                    </Link>
                  </motion.div>
                </div>

                {/* Right - Stats Card */}
                <div className="lg:col-span-2">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-[var(--card)]/50 backdrop-blur-sm border border-[var(--border)] rounded-xl p-5"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <motion.div 
                        className="w-2 h-2 rounded-full bg-green-500"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <span className="text-xs font-mono text-[var(--muted)]">SYSTEM ONLINE</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-[var(--background)]/50 rounded-lg border border-[var(--border)]">
                        <div className="text-xl font-bold text-[#0ea5e9] font-mono">
                          <CountUp end={15} suffix="min" />
                        </div>
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Build Time</div>
                      </div>
                      <div className="p-3 bg-[var(--background)]/50 rounded-lg border border-[var(--border)]">
                        <div className="text-xl font-bold text-[#0ea5e9] font-mono">
                          <CountUp end={12} suffix="hrs" />
                        </div>
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Saved Weekly</div>
                      </div>
                      <div className="p-3 bg-[var(--background)]/50 rounded-lg border border-[var(--border)]">
                        <div className="text-xl font-bold text-[#0ea5e9] font-mono">24/7</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Available</div>
                      </div>
                      <div className="p-3 bg-[var(--background)]/50 rounded-lg border border-[var(--border)]">
                        <div className="text-xl font-bold text-[#0ea5e9] font-mono">60%</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Less Email Time</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--muted)]">First month included</span>
                        <span className="font-mono text-green-400">FREE</span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-[var(--muted)]">Then just</span>
                        <span className="font-mono text-[#0ea5e9]">${MONTHLY_PRICE}/mo</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Benefits Row */}
          <div className="border-t border-[var(--border)] bg-[var(--card)]/20">
            <div className="max-w-6xl mx-auto px-4 py-3">
              <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-xs sm:text-sm">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#0ea5e9]" /> 12 hrs saved weekly</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#0ea5e9]" /> 60% less email time</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#0ea5e9]" /> 2x more follow-ups</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#0ea5e9]" /> 70% faster scheduling</span>
              </div>
            </div>
          </div>
        </section>

        {/* AI Benefits Stats */}
        <section className="py-14 border-y border-[var(--border)] bg-gradient-to-b from-[var(--card)]/30 to-transparent">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <span className="text-xs font-mono text-[#0ea5e9] mb-2 block">PERFORMANCE_METRICS</span>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Realistic Time Savings</h2>
              <p className="text-[var(--muted)]">Conservative estimates based on actual usage</p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {aiBenefits.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="relative p-5 bg-[var(--card)]/40 border border-[var(--border)] rounded-xl hover:border-[#0ea5e9]/30 transition-all group overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#0ea5e9]/10 to-transparent rounded-bl-full" />
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center shrink-0 group-hover:bg-[#0ea5e9]/20 transition-colors">
                        <Icon className="w-5 h-5 text-[#0ea5e9]" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-[#0ea5e9] mb-0.5">{benefit.stat}</div>
                        <div className="text-sm font-medium mb-1">{benefit.label}</div>
                        <div className="text-xs text-[var(--muted)]">{benefit.desc}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-14">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <span className="text-xs font-mono text-[#0ea5e9] mb-2 block">CAPABILITIES</span>
              <h2 className="text-2xl font-bold">Everything Included</h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {features.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="group p-4 bg-[var(--card)]/30 border border-[var(--border)] hover:border-[#0ea5e9]/50 rounded-lg transition-all hover:bg-[var(--card)]/50"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center mb-3 group-hover:bg-[#0ea5e9]/20 transition-colors">
                      <Icon className="w-4 h-4 text-[#0ea5e9]" />
                    </div>
                    <h3 className="text-sm font-medium mb-1">{feat.label}</h3>
                    <p className="text-xs text-[var(--muted)]">{feat.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-14 border-y border-[var(--border)] bg-[var(--card)]/20">
          <div className="max-w-6xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <span className="text-xs font-mono text-[#0ea5e9] mb-2 block">COMPARISON_MATRIX</span>
              <h2 className="text-2xl font-bold">Why Choose Matt</h2>
            </motion.div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 text-xs font-mono text-[var(--muted)] uppercase tracking-wider">Feature</th>
                    <th className="text-center py-3 text-[#0ea5e9] font-bold">Matt</th>
                    <th className="text-center py-3 text-[var(--muted)]">Agency</th>
                    <th className="text-center py-3 text-[var(--muted)]">Freelancer</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-[var(--border)]/50 hover:bg-[var(--card)]/30 transition-colors"
                    >
                      <td className="py-3">{row.feature}</td>
                      <td className="py-3 text-center">
                        {typeof row.matt === "boolean" ? (
                          <Check className="w-4 h-4 text-[#0ea5e9] mx-auto" />
                        ) : (
                          <span className="text-[#0ea5e9] font-mono font-medium">{row.matt}</span>
                        )}
                      </td>
                      <td className="py-3 text-center text-[var(--muted)]">
                        {typeof row.agency === "boolean" ? (
                          row.agency ? <Check className="w-4 h-4 mx-auto opacity-30" /> : "—"
                        ) : (
                          row.agency
                        )}
                      </td>
                      <td className="py-3 text-center text-[var(--muted)]">
                        {typeof row.freelancer === "boolean" ? (
                          row.freelancer ? <Check className="w-4 h-4 mx-auto opacity-30" /> : "—"
                        ) : (
                          row.freelancer
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14">
          <div className="max-w-2xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <span className="text-xs font-mono text-[#0ea5e9] mb-2 block">FAQ_DATABASE</span>
              <h2 className="text-2xl font-bold">Questions</h2>
            </motion.div>

            <div className="bg-[var(--card)]/30 border border-[var(--border)] rounded-lg p-5">
              {faqs.map((faq, i) => (
                <FAQItem
                  key={i}
                  q={faq.q}
                  a={faq.a}
                  isOpen={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-14 border-t border-[var(--border)]">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative p-8 sm:p-10 rounded-2xl border border-[#0ea5e9]/30 bg-gradient-to-br from-[#0ea5e9]/5 to-purple-600/5"
            >
              <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-[#0ea5e9]/50" />
              <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-[#0ea5e9]/50" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-[#0ea5e9]/50" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-[#0ea5e9]/50" />

              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-3xl font-bold">${DAILY_PRICE}</span>
                <span className="text-[var(--muted)]">/day</span>
              </div>
              <p className="text-[var(--muted)] mb-6">
                Limited time: ${SETUP_PRICE} setup (reg. $${ORIGINAL_PRICE})
              </p>
              <Link href="/">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-gradient-to-r from-[#0ea5e9] to-purple-600 hover:from-[#0284c7] hover:to-purple-700 text-white rounded-lg font-semibold shadow-lg shadow-[#0ea5e9]/25 flex items-center gap-2 mx-auto"
                >
                  <Terminal className="w-5 h-5" />
                  CLAIM LIMITED OFFER
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <p className="text-xs text-[var(--muted)] mt-4">
                Then just ${MONTHLY_PRICE}/month for ongoing care
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 bg-[var(--card)]/20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#0ea5e9]" />
            <span>MATT v2.2</span>
          </div>
          <p>© 2026 MATT. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-[#0ea5e9] transition-colors">TERMS</Link>
            <Link href="/privacy" className="hover:text-[#0ea5e9] transition-colors">PRIVACY</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
