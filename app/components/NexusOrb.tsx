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
  orbClassName?: string;
  showEyes?: boolean;
}

export function NexusOrb({
  state = "idle",
  variant = "plasma",
  onClick,
  bubbleText,
  className = "",
  orbClassName = "",
  showEyes = true,
}: NexusOrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const [orbMetrics, setOrbMetrics] = useState({ x: 0, y: 0, size: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  const rotateX = useSpring(0, { damping: 30, stiffness: 100 });
  const rotateY = useSpring(0, { damping: 30, stiffness: 100 });
  const pupilX = useSpring(0, { damping: 25, stiffness: 250 });
  const pupilY = useSpring(0, { damping: 25, stiffness: 250 });
  useEffect(() => {
    const updateCenter = () => {
      if (!orbRef.current) return;
      const rect = orbRef.current.getBoundingClientRect();
      setOrbMetrics({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        size: Math.min(rect.width, rect.height),
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

      if (orbMetrics.x === 0) return;
      const dx = event.clientX - orbMetrics.x;
      const dy = event.clientY - orbMetrics.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxEyeMove = orbMetrics.size > 0 ? Math.min(orbMetrics.size * 0.075, 14) : 10;
      const scale = distance > 0 ? Math.min(distance * 0.04, maxEyeMove) : 0;

      pupilX.set(distance > 0 ? (dx / distance) * scale : 0);
      pupilY.set(distance > 0 ? (dy / distance) * scale : 0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [orbMetrics, rotateX, rotateY, pupilX, pupilY]);

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

  const getCoreBorderRadius = () => {
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

  const coreGlowColor =
    state === "listening"
      ? "rgba(255, 190, 110, 0.42)"
      : state === "thinking"
        ? "rgba(255, 244, 232, 0.24)"
        : "rgba(255, 112, 64, 0.34)";

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
        className={`orb-container relative shrink-0 cursor-pointer rounded-full ${orbClassName || "h-48 w-48 md:h-64 md:w-64"}`}
        animate={{
          y: state === "idle" ? [0, -10, 0] : 0,
          scale: getScale(),
        }}
        transition={{
          y: { duration: 4, repeat: state === "idle" ? Infinity : 0, ease: "easeInOut" },
          scale: {
            duration: state === "speaking" ? 0.5 : state === "idle" ? 4 : 1,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        style={{ rotateX, rotateY }}
      >
        <div className="pointer-events-none absolute inset-[-20%] rounded-full bg-[radial-gradient(circle,rgba(255,128,72,0.28),transparent_66%)] blur-3xl" />
        <div className="pointer-events-none absolute inset-[-4%] rounded-full border border-[#ffca93]/12" />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.16),rgba(255,196,124,0.08)_24%,rgba(9,12,22,0)_68%)]" />

        <motion.div
          className="absolute inset-[6%] overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_36%_30%,rgba(255,250,244,0.14),rgba(255,166,104,0.24)_24%,rgba(25,15,18,0.82)_68%,rgba(5,7,14,0.96)_100%)] shadow-[inset_0_0_60px_rgba(0,0,0,0.5),0_0_60px_rgba(255,107,53,0.16)]"
          animate={{
            borderRadius: getCoreBorderRadius(),
          }}
          transition={{
            borderRadius: {
              duration: state === "speaking" ? 0.8 : 3,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        >
          <motion.div
            className="absolute inset-[12%] rounded-full blur-2xl"
            animate={{
              backgroundColor: coreGlowColor,
              scale: state === "speaking" ? [0.92, 1.08, 0.92] : state === "thinking" ? [0.98, 1.04, 0.98] : 1,
            }}
            transition={{
              backgroundColor: { duration: 0.45 },
              scale: { duration: state === "speaking" ? 0.8 : 1.4, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          <div className="pointer-events-none absolute inset-[4%] rounded-full border border-white/8" />

          {variant === "plasma" ? (
            <div className="absolute inset-0">
              <div className="plasma-ring plasma-ring-1" />
              <div className="plasma-ring plasma-ring-2" />
              <div className="plasma-ring plasma-ring-3" />
              <div className="plasma-ring plasma-ring-4" />
            </div>
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
                className="absolute inset-[10%] rounded-full bg-[#ffaa44]/28 blur-xl"
                animate={{ scale: state === "speaking" ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            </div>
          ) : null}

          {showEyes ? (
            <>
              <motion.div
                className="pointer-events-none absolute left-[41%] top-[40%] z-10 h-[23%] w-[7.5%] min-h-[1rem] min-w-[0.3rem] max-h-[3.6rem] max-w-[0.95rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,0.8)]"
                animate={{ scaleY: isBlinking ? 0.1 : 1 }}
                transition={{ duration: 0.1 }}
                style={{ x: pupilX, y: pupilY }}
              />
              <motion.div
                className="pointer-events-none absolute left-[59%] top-[40%] z-10 h-[23%] w-[7.5%] min-h-[1rem] min-w-[0.3rem] max-h-[3.6rem] max-w-[0.95rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,1),0_0_30px_rgba(255,255,255,0.8)]"
                animate={{ scaleY: isBlinking ? 0.1 : 1 }}
                transition={{ duration: 0.1 }}
                style={{ x: pupilX, y: pupilY }}
              />
            </>
          ) : (
            <div className="pointer-events-none absolute inset-[27%] rounded-full bg-[radial-gradient(circle,rgba(255,251,241,0.72),rgba(255,197,132,0.28)_36%,transparent_72%)] blur-xl" />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
