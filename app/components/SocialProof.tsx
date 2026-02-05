"use client";

import { motion } from "framer-motion";
import { CountUp } from "./CountUp";

interface SocialProofProps {
  className?: string;
}

export function SocialProof({ className = "" }: SocialProofProps) {
  const stats = [
    { value: 500, suffix: "+", label: "AI Agents Deployed" },
    { value: 98, suffix: "%", label: "Customer Satisfaction" },
    { value: 15000, suffix: "+", label: "Hours Saved" },
    { value: 4.9, suffix: "/5", label: "Average Rating" },
  ];

  return (
    <div className={`py-12 border-y border-slate-800/50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-1">
                <CountUp
                  end={stat.value}
                  suffix={stat.suffix}
                  decimals={stat.value % 1 !== 0 ? 1 : 0}
                />
              </div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TrustBadgesProps {
  className?: string;
}

export function TrustBadges({ className = "" }: TrustBadgesProps) {
  const badges = [
    { icon: "🔒", label: "Secure Payment" },
    { icon: "⚡", label: "Instant Delivery" },
    { icon: "✓", label: "Verified Quality" },
    { icon: "🛡️", label: "24/7 Support" },
  ];

  return (
    <div className={`flex flex-wrap justify-center gap-6 ${className}`}>
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-2 text-sm text-slate-400"
        >
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </div>
      ))}
    </div>
  );
}
