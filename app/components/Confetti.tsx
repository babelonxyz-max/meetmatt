"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  rotation: number;
  delay: number;
}

interface ConfettiProps {
  active: boolean;
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

const colors = [
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#f43f5e", // rose-500
];

export function Confetti({
  active,
  count = 50,
  duration = 3000,
  onComplete,
}: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (active) {
      const newPieces: ConfettiPiece[] = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        delay: Math.random() * 0.3,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [active, count, duration, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              x: `${piece.x}vw`,
              y: -10,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              y: "110vh",
              rotate: piece.rotation,
              opacity: [1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2 + Math.random() * 1,
              delay: piece.delay,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            style={{
              position: "absolute",
              width: 8 + Math.random() * 6,
              height: 8 + Math.random() * 6,
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
