"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Footer() {
  return (
    <motion.footer 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Gradient fade above footer */}
      <div className="h-12 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none" />
      
      {/* Floating footer bar */}
      <div className="mx-4 mb-4">
        <div className="max-w-7xl mx-auto bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl px-6 py-3 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">© 2026 Matt AI</span>
            </div>
            
            <div className="flex items-center gap-6">
              <Link 
                href="/privacy" 
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
