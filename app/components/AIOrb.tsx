"use client";

import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";

interface AIOrbProps {
  state?: "idle" | "listening" | "thinking" | "deploying" | "success" | "error";
  size?: "sm" | "md" | "lg" | "xl";
  onClick?: () => void;
  className?: string;
}

const sizeMap = {
  sm: { container: 80, orb: 60 },
  md: { container: 120, orb: 90 },
  lg: { container: 200, orb: 150 },
  xl: { container: 280, orb: 220 },
};

export default function AIOrb({ 
  state = "idle", 
  size = "lg",
  onClick,
  className = ""
}: AIOrbProps) {
  const { container, orb } = sizeMap[size];
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const frameRef = useRef<number>(0);
  const [wobble, setWobble] = useState({ x: 0, y: 0, rotation: 0, scale: 1 });
  const [scanLine, setScanLine] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const [hovered, setHovered] = useState(false);
  
  // Smooth spring for mouse following
  const springConfig = { damping: 20, stiffness: 100, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Memoized animation loop
  const animate = useCallback(() => {
    const elapsed = Date.now();
    
    const breatheFreq = state === "thinking" ? 0.008 : state === "deploying" ? 0.012 : 0.003;
    const wobbleFreq = state === "thinking" ? 0.015 : state === "deploying" ? 0.02 : 0.005;
    
    const breathePhase = elapsed * breatheFreq;
    const wobblePhase = elapsed * wobbleFreq;
    
    const baseScale = state === "thinking" ? 1.08 : state === "deploying" ? 1.12 : 1;
    const breatheAmp = state === "thinking" ? 0.06 : state === "deploying" ? 0.1 : hovered ? 0.05 : 0.03;
    const scale = baseScale + Math.sin(breathePhase) * breatheAmp;
    
    const wobbleIntensity = state === "thinking" ? 8 : state === "deploying" ? 12 : hovered ? 4 : 2;
    const x = Math.sin(wobblePhase) * wobbleIntensity + Math.sin(wobblePhase * 1.3) * (wobbleIntensity * 0.5);
    const y = Math.cos(wobblePhase * 0.8) * wobbleIntensity + Math.cos(wobblePhase * 1.1) * (wobbleIntensity * 0.5);
    const rotation = Math.sin(elapsed * 0.001) * 3;
    
    setWobble({ x, y, rotation, scale });
    setScanLine((elapsed * 0.05) % 100);
    
    frameRef.current = requestAnimationFrame(animate);
  }, [state, hovered]);
  
  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

  // Glitch effect during deploying
  useEffect(() => {
    if (state !== "deploying") {
      setGlitch(false);
      return;
    }
    const glitchInterval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 100 + Math.random() * 150);
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(glitchInterval);
  }, [state]);
  
  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const moveX = (e.clientX - centerX) / centerX;
      const moveY = (e.clientY - centerY) / centerY;
      mouseX.set(moveX * 20);
      mouseY.set(moveY * 20);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const getStateColors = () => {
    switch (state) {
      case "listening": return { primary: "#10b981", secondary: "#34d399", glow: "rgba(16, 185, 129, 0.6)", ring: "rgba(16, 185, 129, 0.3)" };
      case "thinking": return { primary: "#f59e0b", secondary: "#fbbf24", glow: "rgba(245, 158, 11, 0.6)", ring: "rgba(245, 158, 11, 0.3)" };
      case "deploying": return { primary: "#3b82f6", secondary: "#60a5fa", glow: "rgba(59, 130, 246, 0.6)", ring: "rgba(59, 130, 246, 0.3)" };
      case "success": return { primary: "#8b5cf6", secondary: "#a78bfa", glow: "rgba(139, 92, 246, 0.6)", ring: "rgba(139, 92, 246, 0.3)" };
      case "error": return { primary: "#ef4444", secondary: "#f87171", glow: "rgba(239, 68, 68, 0.6)", ring: "rgba(239, 68, 68, 0.3)" };
      default: return { primary: "#3b82f6", secondary: "#06b6d4", glow: "rgba(59, 130, 246, 0.5)", ring: "rgba(6, 182, 212, 0.2)" };
    }
  };

  const colors = getStateColors();
  const particleCount = state === "deploying" ? 20 : state === "thinking" ? 15 : 10;
  
  // Memoized particles
  const particles = useRef(Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    angle: (i / particleCount) * Math.PI * 2,
    distance: orb * 0.6 + Math.random() * 40,
    speed: (0.002 + Math.random() * 0.004) * (state === "deploying" ? 2 : 1),
    size: 2 + Math.random() * 4,
    phase: Math.random() * Math.PI * 2,
  }))).current;

  const arcs = state === "deploying" ? Array.from({ length: 3 }, (_, i) => ({ id: i, delay: i * 0.3 })) : [];

  return (
    <motion.div
      className={`relative flex items-center justify-center cursor-pointer ${className}`}
      style={{ width: container, height: container }}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Outer energy field */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: orb * 1.8,
          height: orb * 1.8,
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          filter: "blur(20px)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: state === "thinking" ? 1 : state === "deploying" ? 0.6 : 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rotating orbital rings */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute rounded-full border pointer-events-none"
          style={{ width: orb + i * 35, height: orb + i * 35, borderColor: colors.ring, borderWidth: 1 }}
          animate={{ rotate: i % 2 === 0 ? [0, 360] : [360, 0], scale: [1, 1.05 + i * 0.02, 1] }}
          transition={{ rotate: { duration: 10 + i * 5, repeat: Infinity, ease: "linear" }, scale: { duration: 2 + i * 0.5, repeat: Infinity, ease: "easeInOut" } }}
        />
      ))}

      {/* Electricity arcs */}
      {arcs.map((arc) => (
        <motion.svg
          key={`arc-${arc.id}`}
          className="absolute pointer-events-none"
          style={{ width: orb * 1.5, height: orb * 1.5 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: arc.delay, repeatDelay: 1.5 }}
        >
          <path d={`M ${orb * 0.75} 0 Q ${orb * 0.9} ${orb * 0.5} ${orb * 0.75} ${orb * 1.5}`} stroke={colors.secondary} strokeWidth="2" fill="none" filter="blur(1px)" />
        </motion.svg>
      ))}

      {/* Energy particles */}
      {particles.map((particle) => (
        <motion.div
          key={`particle-${particle.id}`}
          className="absolute rounded-full pointer-events-none"
          style={{ width: particle.size, height: particle.size, backgroundColor: colors.secondary, boxShadow: `0 0 ${particle.size * 3}px ${colors.glow}` }}
          animate={{
            x: [Math.cos(particle.angle) * particle.distance, Math.cos(particle.angle + Math.PI / 3) * (particle.distance + 15), Math.cos(particle.angle) * particle.distance],
            y: [Math.sin(particle.angle) * particle.distance, Math.sin(particle.angle + Math.PI / 3) * (particle.distance + 15), Math.sin(particle.angle) * particle.distance],
            opacity: [0.3, 0.9, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 2 + particle.speed * 500, repeat: Infinity, ease: "easeInOut", delay: particle.phase }}
        />
      ))}

      {/* Main orb */}
      <motion.div
        className="relative"
        style={{ width: orb, height: orb, x: smoothX, y: smoothY }}
        animate={{ x: wobble.x, y: wobble.y, rotate: wobble.rotation, scale: glitch ? wobble.scale * 1.05 : wobble.scale }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Chromatic aberration for glitch */}
        {glitch && (
          <>
            <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: colors.primary, opacity: 0.5, transform: "translateX(-3px)", mixBlendMode: "screen" }} />
            <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: colors.secondary, opacity: 0.5, transform: "translateX(3px)", mixBlendMode: "screen" }} />
          </>
        )}

        {/* Outer glow */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle at 30% 30%, ${colors.secondary}, transparent)`, filter: "blur(15px)", transform: "scale(1.3)" }}
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [1.2, 1.5, 1.2] }}
          transition={{ duration: state === "thinking" ? 0.8 : state === "deploying" ? 0.5 : 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Secondary glow */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle at 70% 70%, ${colors.primary}40, transparent)`, filter: "blur(10px)", transform: "scale(1.1)" }}
          animate={{ scale: [1.1, 1.3, 1.1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />

        {/* Main orb body */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ background: `conic-gradient(from 0deg, ${colors.primary}, ${colors.secondary}, ${colors.primary}, ${colors.secondary}, ${colors.primary})` }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-[2px] rounded-full" style={{ background: `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}20, ${colors.primary}30)`, backdropFilter: "blur(5px)" }} />
          <motion.div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none"
            style={{ top: `${scanLine}%`, opacity: state === "thinking" || state === "deploying" ? 0.8 : 0.3 }}
            animate={{ opacity: state === "thinking" || state === "deploying" ? [0.3, 0.8, 0.3] : [0.1, 0.3, 0.1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>

        {/* Core */}
        <motion.div
          className="absolute inset-4 rounded-full"
          style={{ background: `radial-gradient(circle at 30% 30%, ${colors.secondary}, ${colors.primary})`, boxShadow: `inset 0 0 30px ${colors.glow}, 0 0 40px ${colors.glow}, 0 0 80px ${colors.glow}` }}
          animate={{ scale: [1, 1.05, 1], boxShadow: [`inset 0 0 30px ${colors.glow}, 0 0 40px ${colors.glow}, 0 0 80px ${colors.glow}`, `inset 0 0 40px ${colors.glow}, 0 0 60px ${colors.glow}, 0 0 120px ${colors.glow}`, `inset 0 0 30px ${colors.glow}, 0 0 40px ${colors.glow}, 0 0 80px ${colors.glow}`] }}
          transition={{ duration: state === "thinking" ? 0.6 : state === "deploying" ? 0.4 : 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Inner highlight */}
        <motion.div
          className="absolute top-4 left-4 w-8 h-8 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)`, filter: "blur(4px)" }}
          animate={{ x: [0, 5, 0], y: [0, 3, 0], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Face */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
          <AnimatePresence mode="wait">
            {state === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex gap-4">
                <motion.div className="w-3 h-4 rounded-full bg-white" animate={{ scaleY: [1, 0.2, 1], opacity: [0.9, 0.5, 0.9] }} transition={{ duration: 3, repeat: Infinity, delay: 0 }} />
                <motion.div className="w-3 h-4 rounded-full bg-white" animate={{ scaleY: [1, 0.2, 1], opacity: [0.9, 0.5, 0.9] }} transition={{ duration: 3, repeat: Infinity, delay: 0.1 }} />
              </motion.div>
            )}
            {state === "listening" && (
              <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                {[...Array(4)].map((_, i) => (
                  <motion.div key={i} className="w-2 rounded-full bg-white" animate={{ height: [6, 28, 6], opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.08 }} />
                ))}
              </motion.div>
            )}
            {state === "thinking" && (
              <motion.div key="thinking" initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 1, rotate: 360 }} exit={{ opacity: 0 }} transition={{ rotate: { duration: 1.5, repeat: Infinity, ease: "linear" } }} className="w-10 h-10 border-3 border-white border-t-transparent rounded-full" />
            )}
            {state === "deploying" && (
              <motion.div key="deploying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
                <motion.div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
                <motion.div className="absolute inset-0 w-7 h-7 m-auto border-2 border-white border-b-transparent rounded-full" animate={{ rotate: -360 }} transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }} />
              </motion.div>
            )}
            {(state === "success" || state === "error") && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} className="text-white text-3xl font-bold">{state === "success" ? "✓" : "×"}</motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Data stream */}
        {(state === "deploying" || state === "thinking") && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.4 }}>
            <defs>
              <linearGradient id={`streamGradient-${state}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.secondary} stopOpacity="0" />
                <stop offset="50%" stopColor={colors.secondary} stopOpacity="1" />
                <stop offset="100%" stopColor={colors.secondary} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[...Array(6)].map((_, i) => (
              <motion.circle key={`stream-${i}`} r="1.5" fill={`url(#streamGradient-${state})`} animate={{ cx: [orb / 2, orb / 2 + (Math.random() - 0.5) * orb * 0.8, orb / 2], cy: [orb / 2, orb / 2 + (Math.random() - 0.5) * orb * 0.8, orb / 2], opacity: [0, 1, 0] }} transition={{ duration: 0.8 + Math.random() * 0.5, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </svg>
        )}
      </motion.div>

      {/* Pulse rings */}
      <AnimatePresence>
        {(state === "listening" || state === "thinking" || state === "deploying") && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`pulse-${i}`}
                className="absolute rounded-full border-2 pointer-events-none"
                style={{ borderColor: colors.primary, width: orb, height: orb }}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Ambient particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`ambient-${i}`}
          className="absolute rounded-full pointer-events-none"
          style={{ width: 2 + i, height: 2 + i, backgroundColor: colors.secondary, opacity: 0.3 }}
          animate={{ x: [0, (i % 2 === 0 ? 1 : -1) * (20 + i * 10), 0], y: [0, (i % 3 === 0 ? -1 : 1) * (20 + i * 10), 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
        />
      ))}

      {/* Binary rain for deploying */}
      {state === "deploying" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`binary-${i}`}
              className="absolute text-[8px] font-mono text-white/20"
              style={{ left: `${10 + i * 12}%`, top: "-10%" }}
              animate={{ y: ["0%", "400%"], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "linear" }}
            >
              {Math.random() > 0.5 ? "1" : "0"}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
