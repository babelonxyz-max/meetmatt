"use client";

import { motion } from "framer-motion";
import { User, Briefcase, Bot, Zap, Shield, Calendar } from "lucide-react";

interface StepAgentTypeProps {
  onSelect: (type: string, description: string) => void;
}

const agentTypes = [
  {
    id: "ai-assistant",
    name: "AI Assistant",
    badge: "Personal Helper",
    description: "Your everyday helper for tasks, scheduling, and information",
    icon: Bot,
    color: "blue",
    features: ["Task management", "Schedule coordination", "Quick answers"],
  },
  {
    id: "digital-employee",
    name: "Digital Employee",
    badge: "Team Member",
    description: "Works alongside your team, handles workflows and processes",
    icon: User,
    color: "purple",
    features: ["Workflow automation", "Data processing", "Report generation"],
  },
  {
    id: "coordinator",
    name: "Work Coordinator",
    badge: "Manager",
    description: "Manages projects, delegates tasks, and keeps track of progress",
    icon: Calendar,
    color: "amber",
    features: ["Project tracking", "Team coordination", "Deadline management"],
  },
  {
    id: "specialist",
    name: "Domain Specialist",
    badge: "Expert",
    description: "Deep expertise in specific areas like support, sales, or research",
    icon: Shield,
    color: "emerald",
    features: ["Customer support", "Lead qualification", "Research assistance"],
  },
];

export function StepAgentType({ onSelect }: StepAgentTypeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 sm:px-0"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-[var(--foreground)]">
          What role will your assistant play?
        </h2>
        <p className="text-[var(--muted)]">
          Choose the relationship between you and your AI agent
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {agentTypes.map((type) => {
          const Icon = type.icon;
          const colorClasses: Record<string, { bg: string; border: string; icon: string }> = {
            blue: { bg: "bg-blue-500/10", border: "hover:border-blue-500/50", icon: "text-blue-500" },
            purple: { bg: "bg-purple-500/10", border: "hover:border-purple-500/50", icon: "text-purple-500" },
            amber: { bg: "bg-amber-500/10", border: "hover:border-amber-500/50", icon: "text-amber-500" },
            emerald: { bg: "bg-emerald-500/10", border: "hover:border-emerald-500/50", icon: "text-emerald-500" },
          };
          const colors = colorClasses[type.color];

          return (
            <motion.button
              key={type.id}
              onClick={() => onSelect(type.id, type.description)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-5 bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] ${colors.border} rounded-xl text-left transition-all duration-200`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{type.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.icon}`}>
                      {type.badge}
                    </span>
                  </div>
                  <p className="text-[var(--muted)] text-sm mb-3">{type.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {type.features.map((feature) => (
                      <span
                        key={feature}
                        className="px-2 py-1 text-xs bg-[var(--background)] rounded-md text-[var(--muted)]"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
