"use client";

import { useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, children, className = "" }: ModalProps) {
  useLockBodyScroll(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 bg-slate-900 rounded-2xl border border-slate-800 max-w-lg w-full max-h-[90vh] overflow-auto ${className}`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-slate-800 ${className}`}>{children}</div>;
}

export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}

export function ModalFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-t border-slate-800 ${className}`}>{children}</div>;
}
