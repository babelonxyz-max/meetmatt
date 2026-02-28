"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export type NexusOrbState = "idle" | "thinking" | "listening" | "deploying";

interface NexusOrbProps {
  state?: NexusOrbState;
  onClick?: () => void;
  className?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const ORB_THEME: Record<
  NexusOrbState,
  { glow: string; core: string; ring: string; pulse: number }
> = {
  idle: {
    glow: "rgba(96,165,250,0.28)",
    core: "from-blue-500/70 via-cyan-400/55 to-indigo-700/80",
    ring: "rgba(125,211,252,0.38)",
    pulse: 1,
  },
  thinking: {
    glow: "rgba(244,114,182,0.32)",
    core: "from-fuchsia-500/70 via-violet-500/55 to-indigo-700/80",
    ring: "rgba(232,121,249,0.4)",
    pulse: 1.08,
  },
  listening: {
    glow: "rgba(52,211,153,0.34)",
    core: "from-emerald-400/70 via-cyan-400/55 to-blue-700/80",
    ring: "rgba(74,222,128,0.4)",
    pulse: 1.06,
  },
  deploying: {
    glow: "rgba(251,146,60,0.36)",
    core: "from-orange-400/80 via-amber-400/60 to-orange-700/80",
    ring: "rgba(251,146,60,0.45)",
    pulse: 1.1,
  },
};

export function NexusOrb({ state = "idle", onClick, className = "" }: NexusOrbProps) {
  const orbRef = useRef<HTMLButtonElement | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const theme = ORB_THEME[state];

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const orb = orbRef.current;
      if (!orb) return;

      const rect = orb.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const normX = clamp((event.clientX - centerX) / (rect.width / 2), -1, 1);
      const normY = clamp((event.clientY - centerY) / (rect.height / 2), -1, 1);

      setEyeOffset({
        x: normX * 8,
        y: normY * 5,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    let timeoutId = 0;

    const scheduleBlink = () => {
      const next = 2200 + Math.random() * 3200;
      timeoutId = window.setTimeout(() => {
        setIsBlinking(true);
        window.setTimeout(() => setIsBlinking(false), 120);
        scheduleBlink();
      }, next);
    };

    scheduleBlink();
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className={`relative flex h-full w-full items-center justify-center ${className}`}>
      <motion.button
        ref={orbRef}
        type="button"
        aria-label="Nexus Orb"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative h-full w-full cursor-pointer rounded-full border-0 bg-transparent p-0"
        animate={{
          y: [0, -8, 0],
          scale: isHovered ? theme.pulse + 0.03 : theme.pulse,
        }}
        transition={{
          y: { duration: 4.2, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 0.35, ease: "easeOut" },
        }}
      >
        <motion.div
          className="absolute inset-[-18%] rounded-full blur-3xl"
          style={{ backgroundColor: theme.glow }}
          animate={{ opacity: [0.55, 0.95, 0.55], scale: [1, 1.08, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {[0, 1, 2].map((ring) => (
          <motion.div
            key={ring}
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: theme.ring, opacity: 0.55 - ring * 0.14 }}
            animate={{
              rotate: ring % 2 === 0 ? 360 : -360,
              scale: [1 + ring * 0.03, 1.03 + ring * 0.03, 1 + ring * 0.03],
              borderRadius: [
                "50%",
                "46% 54% 52% 48% / 48% 44% 56% 52%",
                "50%",
              ],
            }}
            transition={{
              rotate: { duration: 14 + ring * 4, repeat: Infinity, ease: "linear" },
              scale: { duration: 3 + ring, repeat: Infinity, ease: "easeInOut" },
              borderRadius: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        ))}

        <motion.div
          className={`absolute inset-[8%] overflow-hidden rounded-full bg-gradient-to-br ${theme.core} shadow-[inset_0_0_35px_rgba(0,0,0,0.45)]`}
          animate={{
            borderRadius: [
              "50%",
              "44% 56% 52% 48% / 53% 44% 56% 47%",
              "51% 49% 45% 55% / 47% 56% 44% 53%",
              "50%",
            ],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_34%_28%,rgba(255,255,255,0.58),transparent_45%)]"
            animate={{ opacity: [0.45, 0.8, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_66%_70%,rgba(255,255,255,0.2),transparent_52%)]"
            animate={{ x: [-8, 9, -8], y: [6, -7, 6], scale: [1, 1.1, 1] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative flex w-20 items-center justify-between">
              <motion.div
                className="h-10 w-3 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.85)] sm:h-12 sm:w-3.5"
                animate={{
                  x: eyeOffset.x,
                  y: eyeOffset.y,
                  scaleY: isBlinking ? 0.1 : 1,
                }}
                transition={{
                  x: { type: "spring", stiffness: 220, damping: 18 },
                  y: { type: "spring", stiffness: 220, damping: 18 },
                  scaleY: { duration: 0.1 },
                }}
              />
              <motion.div
                className="h-10 w-3 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.85)] sm:h-12 sm:w-3.5"
                animate={{
                  x: eyeOffset.x,
                  y: eyeOffset.y,
                  scaleY: isBlinking ? 0.1 : 1,
                }}
                transition={{
                  x: { type: "spring", stiffness: 220, damping: 18 },
                  y: { type: "spring", stiffness: 220, damping: 18 },
                  scaleY: { duration: 0.1 },
                }}
              />
            </div>
          </div>
        </motion.div>
      </motion.button>
    </div>
  );
}
