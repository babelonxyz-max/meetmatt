"use client";

import { memo, useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { playOrbActivate, playOrbPulse, playOrbHover } from "@/lib/audio";

export interface AIOrbProps {
  isListening?: boolean;
  isThinking?: boolean;
  intensity?: "low" | "medium" | "high";
  wizardState?: "idle" | "initializing" | "processing" | "deploying" | "success";
}

type ReactionType = "giggle" | "spin" | "bounce" | "wink" | "pulse" | "backflip" | null;

// Enhanced AI Orb with liquid morphing, cursor-tracking eyes, wizard reactions
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
  
  // Eye tracking state
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  
  // Color phase (0-3 for different colors)
  const [colorPhase, setColorPhase] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [targetColorPhase, setTargetColorPhase] = useState(0);

  // Track mouse for eye movement (NOT for orb rotation)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate offset for eyes (-4 to 4 pixels max)
        const offsetX = Math.max(-4, Math.min(4, (e.clientX - centerX) / 20));
        const offsetY = Math.max(-3, Math.min(3, (e.clientY - centerY) / 20));
        
        setEyeOffset({ x: offsetX, y: offsetY });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Play activation sound on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      playOrbActivate();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Pulse sound on state changes
  useEffect(() => {
    if (isThinking || isListening || wizardState === "deploying") {
      const interval = setInterval(() => {
        playOrbPulse();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isThinking, isListening, wizardState]);

  // Clear reaction after animation
  useEffect(() => {
    if (reaction) {
      const timer = setTimeout(() => setReaction(null), reaction === "backflip" ? 2000 : 1500);
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

  // Color changing animation - smooth cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setColorPhase((prev) => (prev + 1) % 4);
    }, 5000); // Change every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Automatic eye blinking - using CSS animation approach for reliability
  useEffect(() => {
    const scheduleBlink = () => {
      const nextBlink = 2000 + Math.random() * 4000; // 2-6 seconds
      const timer = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        scheduleBlink();
      }, nextBlink);
      return timer;
    };
    
    const timer = scheduleBlink();
    return () => clearTimeout(timer);
  }, []);

  // React to wizard state changes
  useEffect(() => {
    if (wizardState === "initializing") {
      // Backflip + orange color change
      setReaction("backflip");
      setTargetColorPhase(1); // Orange
      setColorPhase(1);
      setBubbleText("Let's go! 🚀");
      setShowBubble(true);
      playOrbActivate();
      
      // Reset color after animation
      setTimeout(() => {
        setTargetColorPhase(0);
        setColorPhase(0);
      }, 2000);
    } else if (wizardState === "deploying") {
      setTargetColorPhase(3); // Green for deploying
      setColorPhase(3);
      setBubbleText("Deploying... ⚡");
      setShowBubble(true);
    } else if (wizardState === "success") {
      setReaction("pulse");
      setTargetColorPhase(2); // Purple for success
      setColorPhase(2);
      setBubbleText("Success! 🎉");
      setShowBubble(true);
      
      setTimeout(() => {
        setTargetColorPhase(0);
        setColorPhase(0);
      }, 3000);
    }
  }, [wizardState]);

  const handleClick = useCallback(() => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    const reactions: ReactionType[] = ["giggle", "spin", "bounce", "wink", "pulse"];
    const nextReaction = reactions[(newCount - 1) % reactions.length];
    setReaction(nextReaction);
    
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

  const state = isThinking || wizardState === "deploying" ? "thinking" : isListening || wizardState === "processing" ? "listening" : "idle";

  const intensityMultiplier = {
    low: 0.6,
    medium: 1,
    high: 1.4,
  }[intensity];

  // Color schemes for different phases
  const colorSchemes = [
    { primary: "14,165,233", secondary: "6,182,212", accent: "99,102,241", name: "cyan" }, // Cyan-Blue
    { primary: "249,115,22", secondary: "251,146,60", accent: "234,88,12", name: "orange" }, // Orange
    { primary: "168,85,247", secondary: "192,132,252", accent: "147,51,234", name: "purple" }, // Purple
    { primary: "34,197,94", secondary: "74,222,128", accent: "22,163,74", name: "green" }, // Green
  ];
  
  const colors = colorSchemes[colorPhase];

  // Reaction animations - NO 3D transforms that get stuck!
  const reactionVariants = {
    giggle: {
      x: [0, -8, 8, -8, 8, 0],
      transition: { duration: 0.5 }
    },
    spin: {
      rotate: [0, 360],
      transition: { duration: 0.8, ease: "easeInOut" as const }
    },
    bounce: {
      y: [0, -40, 0, -20, 0],
      transition: { duration: 0.8, ease: "easeOut" as const }
    },
    wink: {
      scaleY: [1, 0.1, 1],
      transition: { duration: 0.3 }
    },
    pulse: {
      scale: [1, 1.3, 1, 1.15, 1],
      transition: { duration: 0.8 }
    },
    backflip: {
      rotate: [0, -180, -360],
      scale: [1, 0.8, 1],
      y: [0, -30, 0],
      transition: { duration: 1.2, ease: "easeInOut" as const }
    }
  };

  // Liquid morphing border radius for shapeshifting effect
  const liquidMorph = {
    borderRadius: [
      "50% 50% 50% 50% / 50% 50% 50% 50%",
      "45% 55% 50% 50% / 50% 45% 55% 50%",
      "50% 50% 45% 55% / 55% 50% 50% 45%",
      "55% 45% 50% 50% / 50% 55% 45% 50%",
      "50% 50% 55% 45% / 45% 50% 50% 55%",
      "50% 50% 50% 50% / 50% 50% 50% 50%",
    ],
  };

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-full h-full min-h-[200px]">
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

      <motion.div
        className="relative w-44 h-44 sm:w-52 sm:h-52 lg:w-60 lg:h-60 cursor-pointer"
        animate={reaction ? reactionVariants[reaction] : {
          y: [0, -5, 0],
        }}
        transition={reaction ? undefined : {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.05 }}
        onHoverStart={handleHoverStart}
        onHoverEnd={() => setIsHovered(false)}
        onClick={handleClick}
        // NO rotateX/rotateY - prevents getting stuck!
        style={{ transformStyle: "flat" }}
      >
        {/* Outer energy field with color changing */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`field-${i}`}
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${colors.primary},${0.15 - i * 0.03}) 0%, transparent 70%)`,
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
                ? [0.3, 0.8, 0.3] 
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
              borderColor: `rgba(${colors.primary},${0.25 - i * 0.1})`,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{
              duration: 12 + i * 8,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}

        {/* Main orb container with LIQUID MORPHING */}
        <motion.div
          className="absolute inset-5 rounded-full overflow-hidden"
          animate={{
            borderRadius: liquidMorph.borderRadius,
            scale: state === "thinking" 
              ? [1, 1.08, 1] 
              : state === "listening" 
              ? [1, 1.04, 1] 
              : isHovered
              ? [1, 1.03, 1]
              : [1, 1.01, 1],
          }}
          transition={{
            borderRadius: {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            },
            scale: {
              duration: state === "thinking" ? 0.6 : state === "listening" ? 1 : 2,
              repeat: Infinity,
              ease: "easeInOut",
            }
          }}
        >
          {/* Animated gradient background with color shifting */}
          <motion.div
            className="absolute inset-0"
            animate={{
              background: colorSchemes.map(cs => 
                `radial-gradient(ellipse at 30% 30%, rgba(${cs.primary},1) 0%, rgba(${cs.secondary},0.9) 25%, rgba(${cs.accent},0.7) 50%, rgba(0,0,0,0.95) 100%)`
              )
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Liquid blob 1 */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 60% 60%, rgba(${colors.accent},0.7) 0%, transparent 50%)`,
            }}
            animate={{
              x: [-40, 40, -40],
              y: [-30, 30, -30],
              scale: [1, 1.3, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: state === "thinking" ? 2 : 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Liquid blob 2 */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 40% 70%, rgba(${colors.primary},0.6) 0%, transparent 45%)`,
            }}
            animate={{
              x: [30, -30, 30],
              y: [20, -20, 20],
              scale: [1, 1.2, 1],
              rotate: [0, -60, 0],
            }}
            transition={{
              duration: state === "thinking" ? 3 : 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Liquid blob 3 - extra shapeshifting */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 70% 30%, rgba(${colors.secondary},0.5) 0%, transparent 40%)`,
            }}
            animate={{
              x: [-20, 20, -20],
              y: [30, -30, 30],
              scale: [0.8, 1.4, 0.8],
              borderRadius: ["50%", "30% 70% 70% 30%", "50%"],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Core glow pulse */}
          <motion.div
            className="absolute inset-0"
            animate={{
              opacity: state === "thinking" ? [0.4, 1, 0.4] : [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, transparent 40%)`,
            }}
          />

          {/* White Eyeballs with CURSOR TRACKING and BLINKING */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              className="relative w-14 h-8"
              animate={reaction === "wink" ? { scaleY: [1, 0.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {/* Left Eye - tracks cursor */}
              <motion.div 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 shadow-lg"
                animate={{
                  x: isBlinking ? 0 : eyeOffset.x,
                  y: isBlinking ? 0 : eyeOffset.y,
                  scaleY: isBlinking ? 0.1 : 1,
                }}
                transition={{ 
                  x: { type: "spring", stiffness: 300, damping: 20 },
                  y: { type: "spring", stiffness: 300, damping: 20 },
                  scaleY: { duration: 0.1 }
                }}
                style={{
                  boxShadow: "0 0 10px rgba(255,255,255,0.5)"
                }}
              />
              
              {/* Right Eye - tracks cursor */}
              <motion.div 
                className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/90 shadow-lg"
                animate={{
                  x: isBlinking ? 0 : eyeOffset.x,
                  y: isBlinking ? 0 : eyeOffset.y,
                  scaleY: isBlinking ? 0.1 : 1,
                }}
                transition={{ 
                  x: { type: "spring", stiffness: 300, damping: 20 },
                  y: { type: "spring", stiffness: 300, damping: 20 },
                  scaleY: { duration: 0.1 }
                }}
                style={{
                  boxShadow: "0 0 10px rgba(255,255,255,0.5)"
                }}
              />
            </motion.div>
          </div>

          {/* Specular highlights */}
          <div 
            className="absolute top-[12%] left-[18%] w-[30%] h-[25%] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)`,
              filter: "blur(4px)",
            }}
          />
          
          <div 
            className="absolute bottom-[18%] right-[22%] w-[20%] h-[20%] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, transparent 60%)`,
              filter: "blur(3px)",
            }}
          />
        </motion.div>

        {/* Inner ring */}
        <div 
          className="absolute inset-5 rounded-full border-2 pointer-events-none"
          style={{
            borderColor: `rgba(${colors.primary},0.4)`,
            boxShadow: `
              inset 0 0 25px rgba(${colors.primary},0.3),
              0 0 35px rgba(${colors.primary},0.3)
            `,
          }}
        />

        {/* Energy particles */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * 360;
          const distance = 65 + (i % 3) * 10;
          return (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
              style={{
                top: "50%",
                left: "50%",
                marginLeft: -3,
                marginTop: -3,
                background: `rgba(${i % 2 === 0 ? colors.primary : colors.accent},0.9)`,
                boxShadow: `0 0 8px rgba(${i % 2 === 0 ? colors.primary : colors.accent},0.9)`,
              }}
              animate={{
                x: [
                  Math.cos((angle * Math.PI) / 180) * 55,
                  Math.cos((angle * Math.PI) / 180) * distance,
                  Math.cos((angle * Math.PI) / 180) * 55,
                ],
                y: [
                  Math.sin((angle * Math.PI) / 180) * 55,
                  Math.sin((angle * Math.PI) / 180) * distance,
                  Math.sin((angle * Math.PI) / 180) * 55,
                ],
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: 2 + i * 0.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          );
        })}

        {/* Shockwave effect when thinking */}
        {state === "thinking" && (
          <>
            {[...Array(2)].map((_, i) => (
              <motion.div
                key={`shock-${i}`}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ borderColor: `rgba(${colors.primary},0.5)` }}
                initial={{ scale: 0.8, opacity: 0.8, borderWidth: "2px" }}
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
        )}

        {/* Hover ripple */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 pointer-events-none"
            style={{ borderColor: `rgba(${colors.primary},0.4)` }}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: [0.8, 1.2, 1.2], opacity: [0.5, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Status glow */}
        <motion.div
          className="absolute -inset-3 rounded-full pointer-events-none"
          animate={{
            boxShadow: state === "thinking"
              ? [
                  `0 0 50px rgba(${colors.primary},0.4)`,
                  `0 0 90px rgba(${colors.primary},0.6)`,
                  `0 0 50px rgba(${colors.primary},0.4)`,
                ]
              : state === "listening"
              ? [
                  `0 0 35px rgba(${colors.accent},0.3)`,
                  `0 0 55px rgba(${colors.accent},0.5)`,
                  `0 0 35px rgba(${colors.accent},0.3)`,
                ]
              : isHovered
              ? [
                  `0 0 45px rgba(${colors.primary},0.4)`,
                  `0 0 65px rgba(${colors.primary},0.5)`,
                  `0 0 45px rgba(${colors.primary},0.4)`,
                ]
              : [
                  `0 0 25px rgba(${colors.primary},0.2)`,
                  `0 0 45px rgba(${colors.primary},0.3)`,
                  `0 0 25px rgba(${colors.primary},0.2)`,
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
