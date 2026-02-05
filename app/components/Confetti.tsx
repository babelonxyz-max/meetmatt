"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  delay: number;
  duration: number;
}

interface ConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
}

const colors = ["#0ea5e9", "#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"];

export function Confetti({ isActive, onComplete }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -20 - Math.random() * 20,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[300] overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              x: `${piece.x}vw`,
              y: `${piece.y}vh`,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              x: `${piece.x + (Math.random() - 0.5) * 30}vw`,
              y: "110vh",
              rotate: piece.rotation + 720,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: piece.duration,
              delay: piece.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              position: "absolute",
              width: "8px",
              height: "8px",
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? "50%" : "0%",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
