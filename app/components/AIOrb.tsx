"use client";

import { motion } from "framer-motion";

interface AIOrbProps {
  isListening?: boolean;
  isThinking?: boolean;
}

export function AIOrb({ isListening = false, isThinking = false }: AIOrbProps) {
  const getState = () => {
    if (isThinking) return "thinking";
    if (isListening) return "listening";
    return "idle";
  };

  const state = getState();

  return (
    <div className="relative w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56">
      {/* Outer glow rings */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)`,
        }}
        animate={{
          scale: state === "thinking" ? [1, 1.3, 1] : state === "listening" ? [1, 1.15, 1] : [1, 1.05, 1],
          opacity: state === "thinking" ? [0.5, 0.8, 0.5] : [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: state === "thinking" ? 1.5 : state === "listening" ? 1 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary outer ring */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)`,
        }}
        animate={{
          scale: state === "thinking" ? [1, 1.2, 1] : [1, 1.08, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          scale: {
            duration: state === "thinking" ? 1.8 : 4,
            repeat: Infinity,
            ease: "easeInOut",
          },
          rotate: {
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      />

      {/* Orb container with breathing animation */}
      <motion.div
        className="absolute inset-8 rounded-full overflow-hidden"
        animate={{
          scale: state === "thinking" ? [1, 1.05, 1] : [1, 1.02, 1],
        }}
        transition={{
          duration: state === "thinking" ? 0.8 : 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Main orb gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 30% 30%, rgba(14,165,233,1) 0%, rgba(6,182,212,0.8) 25%, rgba(99,102,241,0.6) 50%, rgba(0,0,0,0.8) 100%)`,
          }}
        />
        
        {/* Moving inner gradient for liquid effect */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 60% 60%, rgba(99,102,241,0.6) 0%, transparent 60%)`,
          }}
          animate={{
            x: [-20, 20, -20],
            y: [-15, 15, -15],
          }}
          transition={{
            duration: state === "thinking" ? 2 : 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Secondary floating gradient */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 40% 70%, rgba(14,165,233,0.5) 0%, transparent 50%)`,
          }}
          animate={{
            x: [15, -15, 15],
            y: [10, -10, 10],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: state === "thinking" ? 2.5 : 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Specular highlight */}
        <div 
          className="absolute top-[15%] left-[20%] w-[30%] h-[25%] rounded-full"
          style={{
            background: `radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)`,
            filter: "blur(8px)",
          }}
        />

        {/* Bottom reflection */}
        <div 
          className="absolute bottom-[10%] right-[25%] w-[20%] h-[20%] rounded-full"
          style={{
            background: `radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 60%)`,
            filter: "blur(4px)",
          }}
        />
      </motion.div>

      {/* Border ring */}
      <div 
        className="absolute inset-8 rounded-full border border-white/10"
        style={{
          boxShadow: `
            inset 0 0 20px rgba(14,165,233,0.1),
            0 0 30px rgba(14,165,233,0.1)
          `,
        }}
      />

      {/* Rotating orbital rings */}
      <motion.div
        className="absolute inset-0 rounded-full border border-white/5"
        style={{
          borderStyle: "dashed",
          borderWidth: "1px",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        className="absolute -inset-4 rounded-full border border-white/[0.03]"
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />

      {/* Energy particles */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * 360;
        return (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#0ea5e9]"
            style={{
              top: "50%",
              left: "50%",
              marginTop: -2,
              marginLeft: -2,
            }}
            animate={{
              x: [
                Math.cos((angle * Math.PI) / 180) * 60,
                Math.cos((angle * Math.PI) / 180) * 100,
                Math.cos((angle * Math.PI) / 180) * 60,
              ],
              y: [
                Math.sin((angle * Math.PI) / 180) * 60,
                Math.sin((angle * Math.PI) / 180) * 100,
                Math.sin((angle * Math.PI) / 180) * 60,
              ],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1.5, 0.5],
            }}
            transition={{
              duration: 3 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* Pulse rings on thinking */}
      {state === "thinking" && (
        <>
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={`pulse-${i}`}
              className="absolute inset-0 rounded-full border border-[#0ea5e9]/30"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
