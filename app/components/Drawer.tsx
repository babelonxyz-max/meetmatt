"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  position?: "left" | "right" | "top" | "bottom";
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  children,
  position = "right",
  size = "md",
  className = "",
}: DrawerProps) {
  useLockBodyScroll(isOpen);

  const sizes = {
    sm: { width: "300px", height: "300px" },
    md: { width: "400px", height: "400px" },
    lg: { width: "500px", height: "500px" },
    full: { width: "100%", height: "100%" },
  };

  const positions = {
    left: { x: "-100%", y: 0 },
    right: { x: "100%", y: 0 },
    top: { x: 0, y: "-100%" },
    bottom: { x: 0, y: "100%" },
  };

  const isHorizontal = position === "left" || position === "right";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Drawer */}
          <motion.div
            initial={positions[position]}
            animate={{ x: 0, y: 0 }}
            exit={positions[position]}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`
              fixed z-50 bg-slate-950 border-slate-800
              ${position === "left" ? "left-0 top-0 bottom-0 border-r" : ""}
              ${position === "right" ? "right-0 top-0 bottom-0 border-l" : ""}
              ${position === "top" ? "top-0 left-0 right-0 border-b" : ""}
              ${position === "bottom" ? "bottom-0 left-0 right-0 border-t" : ""}
              ${className}
            `}
            style={{
              width: isHorizontal ? sizes[size].width : undefined,
              height: !isHorizontal ? sizes[size].height : undefined,
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
