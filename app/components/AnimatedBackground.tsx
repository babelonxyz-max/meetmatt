"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function AnimatedBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--background)] via-[var(--background)] to-[var(--background)]" />
      
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)",
          left: mousePos.x - 300,
          top: mousePos.y - 300,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating orbs */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: 200 + i * 100,
            height: 200 + i * 100,
            background: `radial-gradient(circle, ${
              i % 2 === 0 
                ? "rgba(59, 130, 246, 0.15)" 
                : "rgba(139, 92, 246, 0.15)"
            } 0%, transparent 70%)`,
            left: `${10 + i * 20}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            x: [0, 50, -50, 0],
            y: [0, -30, 30, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Animated stars/dots */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0.1, 0.5, 0.1],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Connecting lines - neural network style */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <motion.line
          x1="10%" y1="20%" x2="30%" y2="40%"
          stroke="currentColor"
          strokeWidth="1"
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.line
          x1="70%" y1="30%" x2="90%" y2="60%"
          stroke="currentColor"
          strokeWidth="1"
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
        <motion.line
          x1="20%" y1="70%" x2="50%" y2="80%"
          stroke="currentColor"
          strokeWidth="1"
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 6, repeat: Infinity, delay: 2 }}
        />
      </svg>

      {/* Corner glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
    </div>
  );
}
