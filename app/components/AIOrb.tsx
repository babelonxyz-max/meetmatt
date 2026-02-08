"use client";

import { memo, useEffect, useRef, useState, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";
import { playOrbActivate, playOrbPulse, playOrbHover } from "@/lib/audio";

export interface AIOrbProps {
  isListening?: boolean;
  isThinking?: boolean;
  intensity?: "low" | "medium" | "high";
  wizardState?: "idle" | "initializing" | "processing" | "deploying" | "success";
}

type ReactionType = "giggle" | "spin" | "bounce" | "wink" | "pulse" | "backflip" | null;

// Easter egg states
const EASTER_EGG_THRESHOLD = 25; // Mouse movements needed (increased)
const EASTER_EGG_TIME_WINDOW = 1500; // Time window in ms (shorter)
const MIN_MOVEMENT_DISTANCE = 50; // Minimum pixels to count as movement

export const AIOrb = memo(function AIOrb({ 
  isListening = false, 
  isThinking = false,
  intensity = "medium",
  wizardState = "idle"
}: AIOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reaction, setReaction] = useState<ReactionType>(null);
  const [clickCount, setClickCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [colorPhase, setColorPhase] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isSuperSaiyan, setIsSuperSaiyan] = useState(false);
  
  // Easter egg tracking
  const mouseMoveCount = useRef(0);
  const lastMouseMoveTime = useRef(0);
  const isScratching = useRef(false);
  const [crazyEyes, setCrazyEyes] = useState(false);
  const [angerLevel, setAngerLevel] = useState(0);
  const controls = useAnimation();

  // Track mouse position history for easter egg
  const mouseHistory = useRef<{x: number, y: number, time: number}[]>([]);
  
  // Normal eye tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || isSuperSaiyan) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const now = Date.now();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Check if mouse is over the orb
      const isOverOrb = mouseX >= rect.left && mouseX <= rect.right && 
                        mouseY >= rect.top && mouseY <= rect.bottom;
      
      if (isOverOrb) {
        // Add to history
        mouseHistory.current.push({ x: mouseX, y: mouseY, time: now });
        
        // Keep only last 500ms of history
        mouseHistory.current = mouseHistory.current.filter(p => now - p.time < 500);
        
        // Calculate rapid movements (direction changes)
        if (mouseHistory.current.length >= 3) {
          let directionChanges = 0;
          let totalDistance = 0;
          
          for (let i = 2; i < mouseHistory.current.length; i++) {
            const p1 = mouseHistory.current[i - 2];
            const p2 = mouseHistory.current[i - 1];
            const p3 = mouseHistory.current[i];
            
            const d1x = p2.x - p1.x;
            const d1y = p2.y - p1.y;
            const d2x = p3.x - p2.x;
            const d2y = p3.y - p2.y;
            
            // Check for direction change (dot product < 0 means > 90 degree turn)
            const dotProduct = d1x * d2x + d1y * d2y;
            if (dotProduct < 0) {
              directionChanges++;
            }
            
            totalDistance += Math.sqrt(d1x * d1x + d1y * d1y);
          }
          
          // Trigger easter egg only on rapid back-and-forth
          if (directionChanges >= 3 && totalDistance > 200) {
            const progress = Math.min(directionChanges / 5, 1);
            setCrazyEyes(true);
            setAngerLevel(progress);
            
            if (directionChanges >= 5 && !isSuperSaiyan) {
              triggerSuperSaiyan();
              mouseHistory.current = [];
            }
          } else if (mouseHistory.current.length > 10) {
            // Reset if not enough rapid movement
            mouseHistory.current = [];
            setCrazyEyes(false);
            setAngerLevel(0);
          }
        }
      } else {
        // Mouse left orb - reset
        mouseHistory.current = [];
        setCrazyEyes(false);
        setAngerLevel(0);
      }
      
      // Normal eye movement
      const offsetX = Math.max(-8, Math.min(8, (mouseX - centerX) / 12));
      const offsetY = Math.max(-6, Math.min(6, (mouseY - centerY) / 12));
      setEyeOffset({ x: offsetX, y: offsetY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isSuperSaiyan]);

  const triggerSuperSaiyan = async () => {
    setIsSuperSaiyan(true);
    setCrazyEyes(false);
    playOrbActivate();
    
    // Shake animation
    await controls.start({
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.5 }
    });
    
    // Reset after Super Saiyan mode
    setTimeout(() => {
      setIsSuperSaiyan(false);
      mouseMoveCount.current = 0;
      setAngerLevel(0);
    }, 5000);
  };

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
      playOrbActivate();
    } else if (wizardState === "success") {
      setReaction("pulse");
    }
  }, [wizardState]);

  const handleClick = useCallback(() => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    const reactions: ReactionType[] = ["giggle", "spin", "bounce", "wink", "pulse"];
    setReaction(reactions[(newCount - 1) % reactions.length]);
    playOrbActivate();
  }, [clickCount]);

  const handleHoverStart = () => {
    setIsHovered(true);
    playOrbHover();
  };

  const state = isThinking || wizardState === "deploying" ? "thinking" : isListening || wizardState === "processing" ? "listening" : "idle";
  const intensityMultiplier = { low: 0.6, medium: 1, high: 1.4 }[intensity];

  // Super Saiyan colors
  const superSaiyanColors = {
    primary: "250, 204, 21", // Yellow
    secondary: "251, 191, 36", // Amber
    accent: "245, 158, 11", // Orange
  };

  // Fixed to blue/cyan color scheme for consistent branding
  const normalColorSchemes = [
    { primary: "14,165,233", secondary: "6,182,212", accent: "99,102,241" }, // Sky blue / Cyan
    { primary: "59,130,246", secondary: "96,165,250", accent: "139,92,246" }, // Blue / Indigo
    { primary: "6,182,212", secondary: "34,211,238", accent: "59,130,246" },  // Cyan / Light blue
    { primary: "99,102,241", secondary: "129,140,248", accent: "14,165,233" }, // Indigo / Sky
  ];
  
  const colors = isSuperSaiyan ? superSaiyanColors : normalColorSchemes[colorPhase];
  
  // Crazy eyes animation
  const crazyEyeOffset = crazyEyes ? {
    x: Math.sin(Date.now() / 50) * 10,
    y: Math.cos(Date.now() / 50) * 10,
  } : eyeOffset;

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      {/* Super Saiyan Aura */}
      {isSuperSaiyan && (
        <motion.div
          className="absolute inset-[-50%] rounded-full pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 0.2, repeat: Infinity }}
          style={{
            background: `radial-gradient(circle, rgba(250, 204, 21, 0.6) 0%, rgba(251, 191, 36, 0.3) 40%, transparent 70%)`,
            filter: "blur(20px)",
          }}
        />
      )}

      {/* Anger indicator */}
      {angerLevel > 0 && !isSuperSaiyan && (
        <motion.div
          className="absolute -top-8 left-1/2 -translate-x-1/2 text-2xl"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          {angerLevel > 0.7 ? "😤" : angerLevel > 0.4 ? "😠" : "🤨"}
        </motion.div>
      )}

      {/* Super Saiyan Text */}
      {isSuperSaiyan && (
        <motion.div
          className="absolute -top-12 left-1/2 -translate-x-1/2 text-yellow-400 font-bold text-lg whitespace-nowrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{ textShadow: "0 0 20px rgba(250, 204, 21, 0.8)" }}
        >
          SUPER SAIYAN MODE! 🔥
        </motion.div>
      )}

      {/* Main Orb Container */}
      <motion.div
        className="relative w-full h-full cursor-pointer"
        animate={reaction ? {
          x: reaction === "giggle" ? [0, -8, 8, -8, 8, 0] : 0,
          y: reaction === "bounce" ? [0, -40, 0, -20, 0] : reaction === "backflip" ? [0, -30, 0] : 0,
          rotate: reaction === "spin" ? [0, 360] : reaction === "backflip" ? [0, -180, -360] : 0,
          scale: reaction === "pulse" ? [1, 1.3, 1, 1.15, 1] : reaction === "backflip" ? [1, 0.8, 1] : isSuperSaiyan ? [1, 1.1, 1] : 1,
        } : {
          y: [0, -5, 0],
        }}
        transition={reaction ? { duration: reaction === "backflip" ? 1.2 : 0.8 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: isSuperSaiyan ? 1.1 : 1.05 }}
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
            style={{ background: `radial-gradient(circle, rgba(${colors.primary},${isSuperSaiyan ? 0.4 : 0.15 - i * 0.03}) 0%, transparent 70%)` }}
            animate={{
              scale: isSuperSaiyan ? [1, 1.5, 1] : state === "thinking" ? [1, 1.4 * intensityMultiplier, 1] : state === "listening" ? [1, 1.2 * intensityMultiplier, 1] : isHovered ? [1, 1.15, 1] : [1, 1.1, 1],
              opacity: isSuperSaiyan ? [0.6, 1, 0.6] : state === "thinking" ? [0.3, 0.8, 0.3] : isHovered ? [0.3, 0.5, 0.3] : [0.2, 0.4, 0.2],
            }}
            transition={{ duration: isSuperSaiyan ? 0.3 : 2 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          />
        ))}

        {/* Electric sparks for Super Saiyan */}
        {isSuperSaiyan && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`spark-${i}`}
                className="absolute w-1 h-8 bg-yellow-400 rounded-full"
                style={{
                  left: "50%",
                  top: "50%",
                  transformOrigin: "center",
                  rotate: `${i * 45}deg`,
                }}
                animate={{
                  scaleY: [0, 1.5, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 0.3,
                  repeat: Infinity,
                  delay: i * 0.05,
                }}
              />
            ))}
          </>
        )}

        {/* Orbital rings */}
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={`orbit-${i}`}
            className="absolute inset-0 rounded-full border-2 border-dashed"
            style={{ borderColor: `rgba(${colors.primary},${isSuperSaiyan ? 0.6 : 0.25 - i * 0.1})` }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: isSuperSaiyan ? 3 : 12 + i * 8, repeat: Infinity, ease: "linear" }}
          />
        ))}

        {/* Main orb body */}
        <motion.div
          className="absolute inset-4 rounded-full overflow-hidden"
          animate={{
            borderRadius: isSuperSaiyan ? "50%" : ["50%", "45% 55% 50% 50% / 50% 45% 55% 50%", "50% 50% 45% 55% / 55% 50% 50% 45%", "55% 45% 50% 50% / 50% 55% 45% 50%", "50%"],
            scale: isSuperSaiyan ? [1, 1.1, 1] : state === "thinking" ? [1, 1.08, 1] : state === "listening" ? [1, 1.04, 1] : isHovered ? [1, 1.03, 1] : [1, 1.01, 1],
          }}
          transition={{ borderRadius: { duration: 4, repeat: Infinity, ease: "easeInOut" }, scale: { duration: state === "thinking" ? 0.6 : state === "listening" ? 1 : 2, repeat: Infinity, ease: "easeInOut" }}}
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0"
            animate={{ 
              background: isSuperSaiyan 
                ? "radial-gradient(ellipse at 30% 30%, rgba(250,204,21,1) 0%, rgba(251,191,36,0.9) 25%, rgba(245,158,11,0.7) 50%, rgba(0,0,0,0.95) 100%)"
                : normalColorSchemes.map(cs => `radial-gradient(ellipse at 30% 30%, rgba(${cs.primary},1) 0%, rgba(${cs.secondary},0.9) 25%, rgba(${cs.accent},0.7) 50%, rgba(0,0,0,0.95) 100%)`)
            }}
            transition={{ duration: isSuperSaiyan ? 0.3 : 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Liquid blobs */}
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at 60% 60%, rgba(${colors.accent},0.7) 0%, transparent 50%)` }}
            animate={{ x: [-40, 40, -40], y: [-30, 30, -30], scale: [1, 1.3, 1], rotate: [0, 90, 0] }}
            transition={{ duration: isSuperSaiyan ? 0.5 : state === "thinking" ? 2 : 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at 40% 70%, rgba(${colors.primary},0.6) 0%, transparent 45%)` }}
            animate={{ x: [30, -30, 30], y: [20, -20, 20], scale: [1, 1.2, 1], rotate: [0, -60, 0] }}
            transition={{ duration: isSuperSaiyan ? 0.7 : state === "thinking" ? 3 : 8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Enhanced Eyes */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-16 h-8">
              {/* Left Eye */}
              <motion.div 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/95 shadow-lg"
                animate={{ 
                  x: crazyEyes ? crazyEyeOffset.x : isBlinking ? 0 : eyeOffset.x * 1.5, 
                  y: crazyEyes ? crazyEyeOffset.y : isBlinking ? 0 : eyeOffset.y * 1.5, 
                  scaleY: isBlinking ? 0.1 : 1 
                }}
                transition={{ x: { type: "spring", stiffness: crazyEyes ? 800 : 400, damping: 15 }, y: { type: "spring", stiffness: crazyEyes ? 800 : 400, damping: 15 }, scaleY: { duration: 0.1 } }}
              >
                {isSuperSaiyan && (
                  <div className="absolute inset-0 rounded-full bg-yellow-300 animate-pulse" />
                )}
              </motion.div>
              {/* Right Eye */}
              <motion.div 
                className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/95 shadow-lg"
                animate={{ 
                  x: crazyEyes ? -crazyEyeOffset.x : isBlinking ? 0 : eyeOffset.x * 1.5, 
                  y: crazyEyes ? crazyEyeOffset.y : isBlinking ? 0 : eyeOffset.y * 1.5, 
                  scaleY: isBlinking ? 0.1 : 1 
                }}
                transition={{ x: { type: "spring", stiffness: crazyEyes ? 800 : 400, damping: 15 }, y: { type: "spring", stiffness: crazyEyes ? 800 : 400, damping: 15 }, scaleY: { duration: 0.1 } }}
              >
                {isSuperSaiyan && (
                  <div className="absolute inset-0 rounded-full bg-yellow-300 animate-pulse" />
                )}
              </motion.div>
            </div>
          </div>

          {/* Highlights */}
          <div className="absolute top-[12%] left-[18%] w-[30%] h-[25%] rounded-full pointer-events-none" style={{ background: `radial-gradient(ellipse at center, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)`, filter: "blur(4px)" }} />
        </motion.div>

        {/* Inner ring */}
        <div className="absolute inset-4 rounded-full border-2 pointer-events-none" style={{ borderColor: `rgba(${colors.primary},${isSuperSaiyan ? 0.8 : 0.4})`, boxShadow: `inset 0 0 25px rgba(${colors.primary},${isSuperSaiyan ? 0.6 : 0.3}), 0 0 35px rgba(${colors.primary},${isSuperSaiyan ? 0.6 : 0.3})` }} />

        {/* Status glow */}
        <motion.div
          className="absolute -inset-3 rounded-full pointer-events-none"
          animate={{ boxShadow: isSuperSaiyan 
            ? [`0 0 50px rgba(250, 204, 21, 0.8)`, `0 0 100px rgba(250, 204, 21, 1)`, `0 0 50px rgba(250, 204, 21, 0.8)`]
            : state === "thinking" ? [`0 0 50px rgba(${colors.primary},0.4)`, `0 0 90px rgba(${colors.primary},0.6)`, `0 0 50px rgba(${colors.primary},0.4)`] : state === "listening" ? [`0 0 35px rgba(${colors.accent},0.3)`, `0 0 55px rgba(${colors.accent},0.5)`, `0 0 35px rgba(${colors.accent},0.3)`] : isHovered ? [`0 0 45px rgba(${colors.primary},0.4)`, `0 0 65px rgba(${colors.primary},0.5)`, `0 0 45px rgba(${colors.primary},0.4)`] : [`0 0 25px rgba(${colors.primary},0.2)`, `0 0 45px rgba(${colors.primary},0.3)`, `0 0 25px rgba(${colors.primary},0.2)`] }}
          transition={{ duration: isSuperSaiyan ? 0.2 : 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
});
