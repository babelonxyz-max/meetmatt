"use client";

import { motion } from "framer-motion";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options = [
    { id: "light", icon: Sun, label: "Light" },
    { id: "dark", icon: Moon, label: "Dark" },
    { id: "system", icon: Monitor, label: "System" },
  ] as const;

  return (
    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.id;

        return (
          <motion.button
            key={option.id}
            onClick={() => setTheme(option.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative p-2 rounded-md transition-colors ${
              isActive
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            aria-label={`Switch to ${option.label} mode`}
            title={option.label}
          >
            {isActive && (
              <motion.div
                layoutId="theme-indicator"
                className="absolute inset-0 bg-[#0ea5e9]/20 rounded-md"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <Icon className="w-4 h-4 relative z-10" />
          </motion.button>
        );
      })}
    </div>
  );
}

// Simple toggle for just dark/light (no system)
export function SimpleThemeToggle() {
  try {
    const { resolvedTheme, setTheme } = useTheme();

    return (
      <motion.button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors"
        aria-label="Toggle theme"
      >
        <motion.div
          initial={false}
          animate={{ rotate: resolvedTheme === "dark" ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          {resolvedTheme === "dark" ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </motion.div>
      </motion.button>
    );
  } catch {
    // Fallback if not in ThemeProvider (during SSR)
    return (
      <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400">
        <Moon className="w-4 h-4" />
      </div>
    );
  }
}
