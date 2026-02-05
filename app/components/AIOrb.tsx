"use client";

import { memo, useEffect, useRef } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { playOrbActivate, playOrbPulse } from "@/lib/audio";

interface AIOrbProps {
  isListening?: boolean;
  isThinking?: boolean;
  intensity?: "low" | "medium" | "high";
}

// More dynamic AI Orb with enhanced visuals and audio feedback
export const AIOrb = memo(function AIOrb({ 
  isListening = false, 
  isThinking = false,
  intensity = "medium"
}: AIOrbProps) {
  const controls = useAnimation();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const orbRef = useRef<HTMLDivElement>(null);
  
  // Smooth mouse following for 3D effect
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

  // Mouse tracking for interactive effect
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

  const state = isThinking ? "thinking" : isListening ? "listening" : "idle";

  // Dynamic intensity multipliers
  const intensityMultiplier = {
    low: 0.6,
    medium: 1,
    high: 1.4,
  }[intensity];

  return (
    <motion.div
      ref={orbRef}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 cursor-pointer"
      whileHover={{ scale: 1.05 }}
      onHoverStart={() => playOrbActivate()}
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
              : [1, 1.1, 1],
            opacity: state === "thinking" 
              ? [0.3, 0.7, 0.3] 
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
