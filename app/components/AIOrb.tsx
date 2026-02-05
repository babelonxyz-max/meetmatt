"use client";

import { memo, useEffect, useRef, useState, useCallback } from "react";
import { motion, useAnimation, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { playOrbActivate, playOrbPulse, playOrbHover } from "@/lib/audio";

interface AIOrbProps {
  isListening?: boolean;
  isThinking?: boolean;
  intensity?: "low" | "medium" | "high";
}

type ReactionType = "giggle" | "spin" | "bounce" | "wink" | "pulse" | null;

// Enhanced AI Orb with click reactions, eye tracking, and speech bubbles
export const AIOrb = memo(function AIOrb({ 
  isListening = false, 
  isThinking = false,
  intensity = "medium"
}: AIOrbProps) {
  const controls = useAnimation();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const orbRef = useRef<HTMLDivElement>(null);
  const [reaction, setReaction] = useState<ReactionType>(null);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [clickCount, setClickCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Eye tracking
  const eyeX = useTransform(mouseX, [-150, 150], [-8, 8]);
  const eyeY = useTransform(mouseY, [-150, 150], [-6, 6]);
  
  // Smooth mouse following for 3D effect
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (orbRef.current) {
        const rect = orbRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Play activation sound on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      playOrbActivate();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Pulse sound on state changes
  useEffect(() => {
    if (isThinking || isListening) {
      const interval = setInterval(() => {
        playOrbPulse();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isThinking, isListening]);

  // Clear reaction after animation
  useEffect(() => {
    if (reaction) {
      const timer = setTimeout(() => setReaction(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [reaction]);

  // Clear bubble after display
  useEffect(() => {
    if (showBubble) {
      const timer = setTimeout(() => setShowBubble(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showBubble]);

  const handleClick = useCallback(() => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    // Cycle through reactions
    const reactions: ReactionType[] = ["giggle", "spin", "bounce", "wink", "pulse"];
    const nextReaction = reactions[(newCount - 1) % reactions.length];
    setReaction(nextReaction);
    
    // Show speech bubble with random text
    const bubbleTexts = [
      "Hello! 👋",
      "I'm listening...",
      "Click me again!",
      "Ready to deploy! 🚀",
      "AI power activated! ⚡",
      "Need help? 🤔",
      "System optimal ✓",
      "Let's build something!",
    ];
    setBubbleText(bubbleTexts[Math.floor(Math.random() * bubbleTexts.length)]);
    setShowBubble(true);
    
    playOrbActivate();
  }, [clickCount]);

  const handleHoverStart = () => {
    setIsHovered(true);
    playOrbHover();
    if (!showBubble && Math.random() > 0.7) {
      setBubbleText("Click me! 👆");
      setShowBubble(true);
    }
  };

  const state = isThinking ? "thinking" : isListening ? "listening" : "idle";

  // Dynamic intensity multipliers
  const intensityMultiplier = {
    low: 0.6,
    medium: 1,
    high: 1.4,
  }[intensity];

  // Reaction animations
  const reactionVariants = {
    giggle: {
      rotate: [0, -5, 5, -5, 5, 0],
      scale: [1, 0.95, 1.05, 0.95, 1.05, 1],
      transition: { duration: 0.6 }
    },
    spin: {
      rotate: [0, 360],
      transition: { duration: 0.8, ease: "easeInOut" }
    },
    bounce: {
      y: [0, -30, 0, -15, 0],
      scale: [1, 1.1, 0.9, 1.05, 1],
      transition: { duration: 0.8 }
    },
    wink: {
      scaleY: [1, 0.1, 1],
      transition: { duration: 0.3, times: [0, 0.5, 1] }
    },
    pulse: {
      scale: [1, 1.3, 1, 1.2, 1],
      opacity: [1, 0.8, 1, 0.9, 1],
      transition: { duration: 0.6 }
    }
  };

  return (
    <div className="relative">
      {/* Speech Bubble */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -10 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap"
          >
            <div className="bg-[var(--card)]/90 backdrop-blur-md border border-[var(--border)]/50 px-4 py-2 rounded-xl shadow-lg">
              <p className="text-sm font-medium text-[var(--foreground)]">{bubbleText}</p>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--card)]/90 border-r border-b border-[var(--border)]/50 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={orbRef}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          perspective: 1000,
        }}
        className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 cursor-pointer"
        animate={reaction ? reactionVariants[reaction] : {}}
        whileHover={{ scale: 1.08 }}
        onHoverStart={handleHoverStart}
        onHoverEnd={() => setIsHovered(false)}
        onClick={handleClick}
      >
        {/* Outer energy field - pulsating rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`field-${i}`}
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(14,165,233,${0.1 - i * 0.02}) 0%, transparent 70%)`,
              transform: `translateZ(${-20 - i * 10}px)`,
            }}
            animate={{
              scale: state === "thinking" 
                ? [1, 1.4 * intensityMultiplier, 1] 
                : state === "listening" 
                ? [1, 1.2 * intensityMultiplier, 1] 
                : isHovered
                ? [1, 1.15, 1]
                : [1, 1.1, 1],
              opacity: state === "thinking" 
                ? [0.3, 0.7, 0.3] 
                : isHovered
                ? [0.3, 0.5, 0.3]
                : [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}

        {/* Rotating orbital rings */}
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={`orbit-${i}`}
            className="absolute inset-0 rounded-full border-2 border-dashed"
            style={{
              borderColor: `rgba(14,165,233,${0.2 - i * 0.1})`,
              transform: `rotateX(${60 + i * 15}deg)`,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{
              duration: 15 + i * 5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}

        {/* Main orb container */}
        <motion.div
          className="absolute inset-6 rounded-full overflow-hidden"
          style={{ transform: "translateZ(0)" }}
          animate={{
            scale: state === "thinking" 
              ? [1, 1.08, 1] 
              : state === "listening" 
              ? [1, 1.04, 1] 
              : isHovered
              ? [1, 1.03, 1]
              : [1, 1.02, 1],
          }}
          transition={{
            duration: state === "thinking" ? 0.6 : state === "listening" ? 1 : 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Base gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 30%, 
                rgba(14,165,233,1) 0%, 
                rgba(6,182,212,0.9) 20%, 
                rgba(99,102,241,0.7) 50%, 
                rgba(139,92,246,0.5) 70%,
                rgba(0,0,0,0.9) 100%)`,
            }}
          />

          {/* Animated liquid layers */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 70% 70%, rgba(99,102,241,0.6) 0%, transparent 60%)`,
            }}
            animate={{
              x: [-30, 30, -30],
              y: [-20, 20, -20],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: state === "thinking" ? 3 : 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 40% 80%, rgba(14,165,233,0.5) 0%, transparent 50%)`,
            }}
            animate={{
              x: [20, -20, 20],
              y: [15, -15, 15],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: state === "thinking" ? 4 : 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Core glow */}
          <motion.div
            className="absolute inset-0"
            animate={{
              opacity: state === "thinking" ? [0.5, 1, 0.5] : [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
            }}
          />

          {/* Eye/Face - NEW */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              className="relative w-16 h-10"
              style={{ x: eyeX, y: eyeY }}
            >
              {/* Left Eye */}
              <motion.div 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90"
                animate={reaction === "wink" ? { scaleY: [1, 0.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-900"
                  style={{ x: useTransform(eyeX, v => v * 0.3), y: useTransform(eyeY, v => v * 0.3) }}
                />
              </motion.div>
              
              {/* Right Eye */}
              <motion.div 
                className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90"
              >
                <motion.div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-900"
                  style={{ x: useTransform(eyeX, v => v * 0.3), y: useTransform(eyeY, v => v * 0.3) }}
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Specular highlights */}
          <div 
            className="absolute top-[10%] left-[15%] w-[35%] h-[30%] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)`,
              filter: "blur(6px)",
            }}
          />
          
          <div 
            className="absolute bottom-[15%] right-[20%] w-[25%] h-[25%] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, rgba(255,255,255,0.2) 0%, transparent 60%)`,
              filter: "blur(4px)",
            }}
          />
        </motion.div>

        {/* Inner ring */}
        <div 
          className="absolute inset-6 rounded-full border-2 pointer-events-none"
          style={{
            borderColor: "rgba(14,165,233,0.3)",
            boxShadow: `
              inset 0 0 30px rgba(14,165,233,0.2),
              0 0 40px rgba(14,165,233,0.2)
            `,
          }}
        />

        {/* Energy particles */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * 360;
          const distance = 70 + (i % 3) * 15;
          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
              style={{
                top: "50%",
                left: "50%",
                marginLeft: -3,
                marginTop: -3,
                background: i % 2 === 0 
                  ? "rgba(14,165,233,0.8)" 
                  : "rgba(139,92,246,0.8)",
                boxShadow: `0 0 10px ${i % 2 === 0 ? "rgba(14,165,233,0.8)" : "rgba(139,92,246,0.8)"}`,
              }}
              animate={{
                x: [
                  Math.cos((angle * Math.PI) / 180) * 60,
                  Math.cos((angle * Math.PI) / 180) * distance,
                  Math.cos((angle * Math.PI) / 180) * 60,
                ],
                y: [
                  Math.sin((angle * Math.PI) / 180) * 60,
                  Math.sin((angle * Math.PI) / 180) * distance,
                  Math.sin((angle * Math.PI) / 180) * 60,
                ],
                opacity: [0, 1, 0],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: 2.5 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          );
        })}

        {/* Shockwave effect when thinking */}
        {state === "thinking" && <Shockwaves />}

        {/* Hover ripple effect */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[#0ea5e9]/30 pointer-events-none"
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: [0.8, 1.2, 1.2], opacity: [0.5, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Status glow */}
        <motion.div
          className="absolute -inset-4 rounded-full pointer-events-none"
          animate={{
            boxShadow: state === "thinking"
              ? [
                  "0 0 60px rgba(14,165,233,0.3)",
                  "0 0 100px rgba(14,165,233,0.5)",
                  "0 0 60px rgba(14,165,233,0.3)",
                ]
              : state === "listening"
              ? [
                  "0 0 40px rgba(99,102,241,0.2)",
                  "0 0 60px rgba(99,102,241,0.4)",
                  "0 0 40px rgba(99,102,241,0.2)",
                ]
              : isHovered
              ? [
                  "0 0 50px rgba(14,165,233,0.3)",
                  "0 0 70px rgba(14,165,233,0.4)",
                  "0 0 50px rgba(14,165,233,0.3)",
                ]
              : [
                  "0 0 30px rgba(14,165,233,0.1)",
                  "0 0 50px rgba(14,165,233,0.2)",
                  "0 0 30px rgba(14,165,233,0.1)",
                ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
});

// Shockwave effect component
function Shockwaves() {
  return (
    <>
      {[...Array(2)].map((_, i) => (
        <motion.div
          key={`shock-${i}`}
          className="absolute inset-0 rounded-full border-2 border-[#0ea5e9]/50 pointer-events-none"
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ 
            scale: [0.8, 1.5, 1.5], 
            opacity: [0.8, 0, 0],
            borderWidth: ["2px", "1px", "0px"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.75,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}
