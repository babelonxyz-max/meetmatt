"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring } from "framer-motion";

export type NexusOrbState = "idle" | "speaking" | "listening" | "thinking";
export type NexusOrbVariant = "plasma" | "techy" | "ethereal";

interface NexusOrbProps {
  state?: NexusOrbState;
  variant?: NexusOrbVariant;
  onClick?: () => void;
  bubbleText?: string;
  className?: string;
}

export function NexusOrb({
  state = "idle",
  variant = "plasma",
  onClick,
  bubbleText,
  className = "",
}: NexusOrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const [orbCenter, setOrbCenter] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  const rotateX = useSpring(0, { damping: 30, stiffness: 100 });
  const rotateY = useSpring(0, { damping: 30, stiffness: 100 });
  const pupilX = useSpring(0, { damping: 25, stiffness: 250 });
  const pupilY = useSpring(0, { damping: 25, stiffness: 250 });
  useEffect(() => {
    const updateCenter = () => {
      if (!orbRef.current) return;
      const rect = orbRef.current.getBoundingClientRect();
      setOrbCenter({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    };

    updateCenter();
    const timeoutId = window.setTimeout(updateCenter, 100);
    window.addEventListener("resize", updateCenter);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", updateCenter);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 40;
      const y = (event.clientY / window.innerHeight - 0.5) * -40;
      rotateX.set(y);
      rotateY.set(x);

      if (orbCenter.x === 0) return;
      const dx = event.clientX - orbCenter.x;
      const dy = event.clientY - orbCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxEyeMove = 15;
      const scale = distance > 0 ? Math.min(distance * 0.04, maxEyeMove) : 0;

      pupilX.set(distance > 0 ? (dx / distance) * scale : 0);
      pupilY.set(distance > 0 ? (dy / distance) * scale : 0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [orbCenter, rotateX, rotateY, pupilX, pupilY]);

  useEffect(() => {
    let blinkTimer = 0;
    let closeTimer = 0;

    const scheduleBlink = () => {
      const next = 2200 + Math.random() * 3600;
      blinkTimer = window.setTimeout(() => {
        setIsBlinking(true);
        closeTimer = window.setTimeout(() => setIsBlinking(false), 150);
        scheduleBlink();
      }, next);
    };

    scheduleBlink();
    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(closeTimer);
    };
  }, []);

  const getScale = () => {
    if (state === "speaking") return [1.02, 1.08, 1.02];
    if (state === "listening") return 1.05;
    if (state === "thinking") return [1, 0.98, 1];
    return [1, 1.03, 1];
  };

  const getBorderRadius = () => {
    if (state === "speaking") {
      return [
        "40% 60% 60% 40% / 60% 30% 70% 40%",
        "60% 40% 30% 70% / 40% 60% 40% 60%",
        "40% 60% 60% 40% / 60% 30% 70% 40%",
      ];
    }
    if (state === "listening") {
      return [
        "30% 70% 70% 30% / 30% 30% 70% 70%",
        "70% 30% 30% 70% / 70% 70% 30% 30%",
        "30% 70% 70% 30% / 30% 30% 70% 70%",
      ];
    }
    if (state === "thinking") {
      return [
        "50% 50% 50% 50% / 50% 50% 50% 50%",
        "45% 55% 45% 55% / 55% 45% 55% 45%",
        "50% 50% 50% 50% / 50% 50% 50% 50%",
      ];
    }
    return [
      "50% 50% 50% 50% / 50% 50% 50% 50%",
      "48% 52% 52% 48% / 48% 48% 52% 52%",
      "50% 50% 50% 50% / 50% 50% 50% 50%",
    ];
  };

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <AnimatePresence>
        {bubbleText ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
            className="pointer-events-none absolute bottom-[110%] z-50 mb-4 max-w-[280px] rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-center text-sm text-white shadow-xl backdrop-blur-md"
          >
            {bubbleText}
            <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-white/20 bg-white/10 backdrop-blur-md" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        ref={orbRef}
        className="orb-container relative h-48 w-48 shrink-0 cursor-pointer overflow-hidden border border-white/20 bg-white/[0.02] shadow-[0_0_40px_rgba(99,102,241,0.3)] backdrop-blur-md md:h-64 md:w-64"
        animate={{
          y: state === "idle" ? [0, -10, 0] : 0,
          scale: getScale(),
          borderRadius: getBorderRadius(),
        }}
        transition={{
          y: { duration: 4, repeat: state === "idle" ? Infinity : 0, ease: "easeInOut" },
          scale: {
            duration: state === "speaking" ? 0.5 : state === "idle" ? 4 : 1,
            repeat: Infinity,
            ease: "easeInOut",
          },
          borderRadius: {
            duration: state === "speaking" ? 0.8 : 3,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        style={{ rotateX, rotateY }}
      >
        <motion.div
          className="absolute inset-[15%] rounded-full blur-2xl"
          animate={{
            backgroundColor:
              state === "listening"
                ? "rgba(52, 211, 153, 0.4)"
                : state === "thinking"
                  ? "rgba(232, 121, 249, 0.4)"
                  : "rgba(99, 102, 241, 0.4)",
          }}
          transition={{ duration: 0.5 }}
        />

        {variant === "plasma" ? (
          <>
            <div className="plasma-ring" />
            <div className="plasma-ring" />
            <div className="plasma-ring" />
            <div className="plasma-ring" />
          </>
        ) : null}

        {variant === "techy" ? (
          <div className="tech-core absolute inset-0 rounded-full">
            <div className="tech-ring" />
            <div className="tech-ring-inner" />
            <div className="tech-data" />
            <motion.div
              className="absolute inset-[20%] rounded-full bg-blue-500/20 blur-md"
              animate={{ opacity: state === "thinking" ? [0.2, 0.8, 0.2] : 0.5 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>
        ) : null}

        {variant === "ethereal" ? (
          <div className="absolute inset-0">
            <div className="ethereal-core absolute inset-0 rounded-full" />
            <div className="ethereal-wisp" />
            <div className="ethereal-wisp-2" />
            <motion.div
              className="absolute inset-[10%] rounded-full bg-cyan-400/30 blur-xl"
              animate={{ scale: state === "speaking" ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          </div>
        ) : null}

        <div className="pointer-events-none absolute left-1/2 top-[40%] z-10 flex -translate-x-1/2 -translate-y-1/2 gap-4 md:gap-6">
          <motion.div
            className="h-10 w-3 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,0.8)] md:h-14 md:w-4"
            animate={{ scaleY: isBlinking ? 0.1 : 1 }}
            transition={{ duration: 0.1 }}
            style={{ x: pupilX, y: pupilY }}
          />
          <motion.div
            className="h-10 w-3 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,0.8)] md:h-14 md:w-4"
            animate={{ scaleY: isBlinking ? 0.1 : 1 }}
            transition={{ duration: 0.1 }}
            style={{ x: pupilX, y: pupilY }}
          />
        </div>
      </motion.div>
    </div>
  );
}
