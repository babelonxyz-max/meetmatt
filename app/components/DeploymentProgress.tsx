"use client";

import { motion } from "framer-motion";
import { Loader2, Check, Server, Database, Rocket } from "lucide-react";

interface DeploymentProgressProps {
  agentName: string;
}

const steps = [
  { id: "payment", label: "Payment confirmed", icon: Check },
  { id: "provisioning", label: "Provisioning resources", icon: Server },
  { id: "database", label: "Setting up database", icon: Database },
  { id: "deploy", label: "Deploying agent", icon: Rocket },
];

export function DeploymentProgress({ agentName }: DeploymentProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 bg-[#0ea5e9]/10 rounded-xl border border-[#0ea5e9]/20"
    >
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 text-[#0ea5e9] animate-spin" />
        <div className="w-0.5 h-16 bg-[#0ea5e9]/20 rounded-full overflow-hidden">
          <motion.div
            className="w-full bg-[#0ea5e9]"
            initial={{ height: "0%" }}
            animate={{ height: ["0%", "30%", "60%", "90%", "100%"] }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white mb-1">
          Deploying {agentName}...
        </p>
        <p className="text-xs text-zinc-400 mb-3">
          This usually takes 10-20 seconds
        </p>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.5 }}
              className="flex items-center gap-2"
            >
              <step.icon className="w-3 h-3 text-[#0ea5e9]" />
              <span className="text-xs text-zinc-500">{step.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
