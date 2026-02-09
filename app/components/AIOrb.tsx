"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface AIOrbProps {
  onClick?: () => void;
  className?: string;
  wizardState?: "idle" | "processing" | "deploying";
  showGreeting?: boolean;
}

export function AIOrb({ onClick, className = "", wizardState = "idle", showGreeting = false }: AIOrbProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [blinkState, setBlinkState] = useState<"open" | "half" | "closed">("open");
  const [reaction, setReaction] = useState<"none" | "happy" | "surprised" | "thinking">("none");

  // Mouse tracking for eyes
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 200 };
  const eyeX = useSpring(mouseX, springConfig);
  const eyeY = useSpring(mouseY, springConfig);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const orb = document.getElementById("ai-orb");
      if (!orb) return;

      const rect = orb.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const maxOffset = 8;
      const offsetX = ((e.clientX - centerX) / window.innerWidth) * maxOffset * 2;
      const offsetY = ((e.clientY - centerY) / window.innerHeight) * maxOffset * 2;

      mouseX.set(Math.max(-maxOffset, Math.min(maxOffset, offsetX)));
      mouseY.set(Math.max(-maxOffset, Math.min(maxOffset, offsetY)));
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Blink animation
  useEffect(() => {
    const blinkLoop = () => {
      const delay = 2000 + Math.random() * 4000;
      setTimeout(() => {
        setBlinkState("half");
        setTimeout(() => {
          setBlinkState("closed");
          setTimeout(() => {
            setBlinkState("half");
            setTimeout(() => setBlinkState("open"), 50);
            blinkLoop();
          }, 100);
        }, 50);
      }, delay);
    };
    blinkLoop();
  }, []);

  const handleOrbClick = () => {
    const reactions: ("happy" | "surprised" | "thinking")[] = ["happy", "surprised", "thinking"];
    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
    setReaction(randomReaction);
    setTimeout(() => setReaction("none"), 1500);
    onClick?.();
  };

  const getEyeScaleY = () => {
    if (reaction === "surprised") return 1.4;
    if (reaction === "thinking") return 0.6;
    switch (blinkState) {
      case "closed": return 0.1;
      case "half": return 0.5;
      default: return 1;
    }
  };

  return (
    <motion.div
      id="ai-orb"
      className={`relative cursor-pointer ${className}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleOrbClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Main Orb Container - Force perfect circle with aspect-square */}
      <motion.div
        className="relative w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 aspect-square"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: wizardState === "deploying" ? 10 : wizardState === "processing" ? 30 : 60, repeat: Infinity, ease: "linear" }}
      >
        {/* Outer glow rings */}
        <div className="absolute inset-[-20%] rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-cyan-500/20 blur-2xl" />
        <motion.div
          className="absolute inset-[-10%] rounded-full border-2 border-blue-400/30"
          animate={{ rotate: [0, -360], scale: [1, 1.05, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-[-5%] rounded-full border border-purple-400/20"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        {/* Main gradient orb - perfect circle enforced */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: `radial-gradient(circle at 35% 35%, 
              rgba(59, 130, 246, 1) 0%, 
              rgba(139, 92, 246, 0.9) 40%, 
              rgba(34, 211, 209, 0.7) 70%, 
              rgba(30, 58, 138, 0.5) 100%)`
          }}
          animate={{
            boxShadow: isHovered
              ? "0 0 60px rgba(59, 130, 246, 0.6), 0 0 100px rgba(139, 92, 246, 0.4), inset 0 0 60px rgba(255, 255, 255, 0.2)"
              : "0 0 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(139, 92, 246, 0.3), inset 0 0 40px rgba(255, 255, 255, 0.1)"
          }}
        >
          {/* Inner liquid effect - constrained to circle */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 65% 65%, rgba(34, 211, 209, 0.4), transparent 50%)`
            }}
            animate={{
              scale: [1, 1.1, 1],
              x: [0, 5, 0],
              y: [0, -5, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Shine highlight */}
          <div className="absolute top-[15%] left-[20%] w-[25%] h-[20%] rounded-full bg-white/30 blur-sm" />
        </motion.div>
      </motion.div>

      {/* Eyes container - centered */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex gap-3 sm:gap-4">
          {/* Left Eye */}
          <motion.div
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full"
            style={{ x: eyeX, y: eyeY }}
            animate={{ scaleY: getEyeScaleY() }}
            transition={{ duration: 0.1 }}
          />
          {/* Right Eye */}
          <motion.div
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full"
            style={{ x: eyeX, y: eyeY }}
            animate={{ scaleY: getEyeScaleY() }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* Speech bubble */}
      <motion.div
        className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg whitespace-nowrap border border-zinc-200 dark:border-zinc-700"
        initial={{ opacity: 0, y: 10, scale: 0.8 }}
        animate={{ opacity: (isHovered || showGreeting) ? 1 : 0, y: (isHovered || showGreeting) ? 0 : 10, scale: (isHovered || showGreeting) ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
      >
        <span className="text-sm font-medium text-zinc-900 dark:text-white">
          {reaction === "happy" ? "✨ Hello!" : 
           reaction === "surprised" ? "😮 Oh!" : 
           reaction === "thinking" ? "🤔 Hmm..." : 
           "Hi! I'm Matt!"}
        </span>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-zinc-900 border-r border-b border-zinc-200 dark:border-zinc-700 rotate-45" />
      </motion.div>
    </motion.div>
  );
}
