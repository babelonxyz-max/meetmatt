"use client";

import { memo, useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playOrbActivate, playOrbPulse, playOrbHover } from "@/lib/audio";

export interface AIOrbProps {
  isListening?: boolean;
  isThinking?: boolean;
  intensity?: "low" | "medium" | "high";
  wizardState?: "idle" | "initializing" | "processing" | "deploying" | "success";
}

type ReactionType = "giggle" | "spin" | "bounce" | "wink" | "pulse" | "backflip" | null;

// Pure 2D AI Orb - NO 3D transforms whatsoever
export const AIOrb = memo(function AIOrb({ 
  isListening = false, 
  isThinking = false,
  intensity = "medium",
  wizardState = "idle"
}: AIOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reaction, setReaction] = useState<ReactionType>(null);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [clickCount, setClickCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [colorPhase, setColorPhase] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);

  // Eye tracking - pure 2D
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const offsetX = Math.max(-3, Math.min(3, (e.clientX - centerX) / 30));
        const offsetY = Math.max(-2, Math.min(2, (e.clientY - centerY) / 30));
        setEyeOffset({ x: offsetX, y: offsetY });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => playOrbActivate(), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isThinking || isListening || wizardState === "deploying") {
      const interval = setInterval(() => playOrbPulse(), 2000);
      return () => clearInterval(interval);
    }
  }, [isThinking, isListening, wizardState]);

  useEffect(() => {
    if (reaction) {
      const timer = setTimeout(() => setReaction(null), reaction === "backflip" ? 2000 : 1500);
      return () => clearTimeout(timer);
    }
  }, [reaction]);

  useEffect(() => {
    if (showBubble) {
      const timer = setTimeout(() => setShowBubble(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showBubble]);

  useEffect(() => {
    const interval = setInterval(() => setColorPhase((prev) => (prev + 1) % 4), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const scheduleBlink = () => {
      const nextBlink = 2000 + Math.random() * 4000;
      return setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        scheduleBlink();
      }, nextBlink);
    };
    let timer = scheduleBlink();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (wizardState === "initializing") {
      setReaction("backflip");
      setBubbleText("Let's go! 🚀");
      setShowBubble(true);
      playOrbActivate();
    } else if (wizardState === "deploying") {
      setBubbleText("Deploying... ⚡");
      setShowBubble(true);
    } else if (wizardState === "success") {
      setReaction("pulse");
      setBubbleText("Success! 🎉");
      setShowBubble(true);
    }
  }, [wizardState]);

  const handleClick = useCallback(() => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    const reactions: ReactionType[] = ["giggle", "spin", "bounce", "wink", "pulse"];
    setReaction(reactions[(newCount - 1) % reactions.length]);
    const bubbleTexts = ["Hello! 👋", "I'm listening...", "Ready to deploy! 🚀", "AI power! ⚡", "Need help? 🤔"];
    setBubbleText(bubbleTexts[Math.floor(Math.random() * bubbleTexts.length)]);
    setShowBubble(true);
    playOrbActivate();
  }, [clickCount]);

  const handleHoverStart = () => {
    setIsHovered(true);
    playOrbHover();
  };

  const state = isThinking || wizardState === "deploying" ? "thinking" : isListening || wizardState === "processing" ? "listening" : "idle";

  const intensityMultiplier = { low: 0.6, medium: 1, high: 1.4 }[intensity];

  const colorSchemes = [
    { primary: "14,165,233", secondary: "6,182,212", accent: "99,102,241" },
    { primary: "249,115,22", secondary: "251,146,60", accent: "234,88,12" },
    { primary: "168,85,247", secondary: "192,132,252", accent: "147,51,234" },
    { primary: "34,197,94", secondary: "74,222,128", accent: "22,163,74" },
  ];
  
  const colors = colorSchemes[colorPhase];

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      {/* Speech Bubble */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -10 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap"
          >
            <div className="bg-[var(--card)]/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-xl border border-[var(--border)]">
              <p className="text-sm font-medium text-[var(--foreground)]">{bubbleText}</p>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-[var(--card)]/90" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Orb Container - Pure 2D, NO 3D transforms */}
      <motion.div
        className="relative w-44 h-44 sm:w-52 sm:h-52 lg:w-60 lg:h-60 cursor-pointer"
        animate={reaction ? {
          x: reaction === "giggle" ? [0, -8, 8, -8, 8, 0] : 0,
          y: reaction === "bounce" ? [0, -40, 0, -20, 0] : reaction === "backflip" ? [0, -30, 0] : 0,
          rotate: reaction === "spin" ? [0, 360] : reaction === "backflip" ? [0, -180, -360] : 0,
          scale: reaction === "pulse" ? [1, 1.3, 1, 1.15, 1] : reaction === "backflip" ? [1, 0.8, 1] : 1,
        } : {
          y: [0, -5, 0],
        }}
        transition={reaction ? { duration: reaction === "backflip" ? 1.2 : 0.8 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.05 }}
        onHoverStart={handleHoverStart}
        onHoverEnd={() => setIsHovered(false)}
        onClick={handleClick}
        style={{ transformStyle: "flat", perspective: "none" }}
      >
        {/* Outer glow rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`field-${i}`}
            className="absolute inset-0 rounded-full"
            style={{ background: `radial-gradient(circle, rgba(${colors.primary},${0.15 - i * 0.03}) 0%, transparent 70%)` }}
            animate={{
              scale: state === "thinking" ? [1, 1.4 * intensityMultiplier, 1] : state === "listening" ? [1, 1.2 * intensityMultiplier, 1] : isHovered ? [1, 1.15, 1] : [1, 1.1, 1],
              opacity: state === "thinking" ? [0.3, 0.8, 0.3] : isHovered ? [0.3, 0.5, 0.3] : [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          />
        ))}

        {/* Orbital rings */}
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={`orbit-${i}`}
            className="absolute inset-0 rounded-full border-2 border-dashed"
            style={{ borderColor: `rgba(${colors.primary},${0.25 - i * 0.1})` }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 12 + i * 8, repeat: Infinity, ease: "linear" }}
          />
        ))}

        {/* Main orb body - Liquid morphing with border-radius */}
        <motion.div
          className="absolute inset-5 rounded-full overflow-hidden"
          animate={{
            borderRadius: ["50%", "45% 55% 50% 50% / 50% 45% 55% 50%", "50% 50% 45% 55% / 55% 50% 50% 45%", "55% 45% 50% 50% / 50% 55% 45% 50%", "50%"],
            scale: state === "thinking" ? [1, 1.08, 1] : state === "listening" ? [1, 1.04, 1] : isHovered ? [1, 1.03, 1] : [1, 1.01, 1],
          }}
          transition={{ borderRadius: { duration: 4, repeat: Infinity, ease: "easeInOut" }, scale: { duration: state === "thinking" ? 0.6 : state === "listening" ? 1 : 2, repeat: Infinity, ease: "easeInOut" }}}
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0"
            animate={{ background: colorSchemes.map(cs => `radial-gradient(ellipse at 30% 30%, rgba(${cs.primary},1) 0%, rgba(${cs.secondary},0.9) 25%, rgba(${cs.accent},0.7) 50%, rgba(0,0,0,0.95) 100%)`) }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Liquid blobs */}
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at 60% 60%, rgba(${colors.accent},0.7) 0%, transparent 50%)` }}
            animate={{ x: [-40, 40, -40], y: [-30, 30, -30], scale: [1, 1.3, 1], rotate: [0, 90, 0] }}
            transition={{ duration: state === "thinking" ? 2 : 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at 40% 70%, rgba(${colors.primary},0.6) 0%, transparent 45%)` }}
            animate={{ x: [30, -30, 30], y: [20, -20, 20], scale: [1, 1.2, 1], rotate: [0, -60, 0] }}
            transition={{ duration: state === "thinking" ? 3 : 8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Eyes */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-14 h-8">
              <motion.div 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 shadow-lg"
                animate={{ x: isBlinking ? 0 : eyeOffset.x, y: isBlinking ? 0 : eyeOffset.y, scaleY: isBlinking ? 0.1 : 1 }}
                transition={{ x: { type: "spring", stiffness: 300, damping: 20 }, y: { type: "spring", stiffness: 300, damping: 20 }, scaleY: { duration: 0.1 } }}
              />
              <motion.div 
                className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 shadow-lg"
                animate={{ x: isBlinking ? 0 : eyeOffset.x, y: isBlinking ? 0 : eyeOffset.y, scaleY: isBlinking ? 0.1 : 1 }}
                transition={{ x: { type: "spring", stiffness: 300, damping: 20 }, y: { type: "spring", stiffness: 300, damping: 20 }, scaleY: { duration: 0.1 } }}
              />
            </div>
          </div>

          {/* Highlights */}
          <div className="absolute top-[12%] left-[18%] w-[30%] h-[25%] rounded-full pointer-events-none" style={{ background: `radial-gradient(ellipse at center, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)`, filter: "blur(4px)" }} />
        </motion.div>

        {/* Inner ring */}
        <div className="absolute inset-5 rounded-full border-2 pointer-events-none" style={{ borderColor: `rgba(${colors.primary},0.4)`, boxShadow: `inset 0 0 25px rgba(${colors.primary},0.3), 0 0 35px rgba(${colors.primary},0.3)` }} />

        {/* Status glow */}
        <motion.div
          className="absolute -inset-3 rounded-full pointer-events-none"
          animate={{ boxShadow: state === "thinking" ? [`0 0 50px rgba(${colors.primary},0.4)`, `0 0 90px rgba(${colors.primary},0.6)`, `0 0 50px rgba(${colors.primary},0.4)`] : state === "listening" ? [`0 0 35px rgba(${colors.accent},0.3)`, `0 0 55px rgba(${colors.accent},0.5)`, `0 0 35px rgba(${colors.accent},0.3)`] : isHovered ? [`0 0 45px rgba(${colors.primary},0.4)`, `0 0 65px rgba(${colors.primary},0.5)`, `0 0 45px rgba(${colors.primary},0.4)`] : [`0 0 25px rgba(${colors.primary},0.2)`, `0 0 45px rgba(${colors.primary},0.3)`, `0 0 25px rgba(${colors.primary},0.2)`] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
});
