"use client";

import { motion } from "framer-motion";
import { MessageCircle, Mail, Globe, Clock } from "lucide-react";

interface StepChannelProps {
  onSelect: (channel: string) => void;
}

const channels = [
  {
    id: "telegram",
    name: "Telegram",
    description: "Fast, secure messaging with bot integration",
    icon: MessageCircle,
    status: "available",
    color: "blue",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Perfect for team collaboration",
    icon: MessageCircle,
    status: "coming-soon",
    color: "purple",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Great for communities and teams",
    icon: MessageCircle,
    status: "coming-soon",
    color: "indigo",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Connect with customers globally",
    icon: MessageCircle,
    status: "coming-soon",
    color: "green",
  },
  {
    id: "email",
    name: "Email",
    description: "Traditional email integration",
    icon: Mail,
    status: "coming-soon",
    color: "amber",
  },
  {
    id: "web",
    name: "Web Widget",
    description: "Embed on your website",
    icon: Globe,
    status: "coming-soon",
    color: "orange",
  },
];

export function StepChannel({ onSelect }: StepChannelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 sm:px-0"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 text-[var(--foreground)]">
          Where would you like to chat?
        </h2>
        <p className="text-[var(--muted)]">
          Choose your preferred communication channel
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((channel, i) => {
          const Icon = channel.icon;
          const isAvailable = channel.status === "available";
          const colorClasses: Record<string, { bg: string; border: string; icon: string }> = {
            blue: { bg: "bg-blue-500/10", border: "border-blue-500/50", icon: "text-blue-500" },
            purple: { bg: "bg-purple-500/10", border: "border-purple-500/50", icon: "text-purple-500" },
            indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/50", icon: "text-indigo-500" },
            green: { bg: "bg-green-500/10", border: "border-green-500/50", icon: "text-green-500" },
            amber: { bg: "bg-amber-500/10", border: "border-amber-500/50", icon: "text-amber-500" },
            orange: { bg: "bg-orange-500/10", border: "border-orange-500/50", icon: "text-orange-500" },
          };
          const colors = colorClasses[channel.color];

          return (
            <motion.button
              key={channel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => isAvailable && onSelect(channel.id)}
              disabled={!isAvailable}
              className={`relative p-5 bg-[var(--card)] border rounded-xl text-left transition-all ${
                isAvailable 
                  ? `hover:bg-[var(--card-hover)] border-[var(--border)] hover:${colors.border} cursor-pointer` 
                  : "opacity-60 cursor-not-allowed border-[var(--border)]"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{channel.name}</h3>
                    {channel.status === "coming-soon" && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--border)] text-[var(--muted)]">
                        Coming Soon
                      </span>
                    )}
                    {channel.status === "available" && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/10 text-green-500">
                        Available
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--muted)] text-sm">{channel.description}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-sm text-[var(--muted)] mt-6"
      >
        More channels coming soon. Telegram is fully supported right now.
      </motion.p>
    </motion.div>
  );
}
