"use client";

import { useState, ReactNode } from "react";
import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  variant?: "default" | "pills" | "underline";
  className?: string;
  onChange?: (tabId: string) => void;
}

export function Tabs({
  tabs,
  defaultTab,
  variant = "default",
  className = "",
  onChange,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.disabled) return;
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const variants = {
    default: {
      container: "bg-slate-900/50 p-1 rounded-lg",
      tab: "px-4 py-2 rounded-md text-sm font-medium transition-colors relative",
      active: "text-white",
      inactive: "text-slate-400 hover:text-slate-200",
    },
    pills: {
      container: "flex gap-2",
      tab: "px-4 py-2 rounded-full text-sm font-medium transition-all",
      active: "bg-cyan-500 text-white",
      inactive: "bg-slate-800 text-slate-400 hover:bg-slate-700",
    },
    underline: {
      container: "border-b border-slate-800",
      tab: "px-4 py-3 text-sm font-medium transition-colors relative",
      active: "text-cyan-400",
      inactive: "text-slate-400 hover:text-slate-200",
    },
  };

  const activeTabData = tabs.find((t) => t.id === activeTab);

  return (
    <div className={className}>
      <div className={`flex ${variants[variant].container}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={`
              ${variants[variant].tab}
              ${activeTab === tab.id ? variants[variant].active : variants[variant].inactive}
              ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}
              flex-1 text-center
            `}
          >
            {variant === "default" && activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-slate-800 rounded-md"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {variant === "underline" && activeTab === tab.id && (
              <motion.div
                layoutId="underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-4"
      >
        {activeTabData?.content}
      </motion.div>
    </div>
  );
}
