"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <motion.footer 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="fixed bottom-0 left-0 right-0 z-50 h-16"
    >
      {/* Gradient fade above footer */}
      <div className="h-8 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none" />
      
      {/* Floating footer bar */}
      <div className="mx-4">
        <div className="max-w-7xl mx-auto bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl px-6 py-2.5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--muted)]">© 2026 Meet Matt</span>
            </div>
            
            <div className="flex items-center gap-6">
              <span className="text-sm text-[var(--muted)] flex items-center gap-1.5">
                Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> @ VIBEST
              </span>
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
