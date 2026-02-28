"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const isHome = pathname === "/";

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
        <div
          className={`mx-auto max-w-7xl rounded-2xl px-6 py-2.5 shadow-2xl shadow-black/50 backdrop-blur-xl ${
            isHome
              ? "border border-white/15 bg-[#050a18]/82 text-white"
              : "border border-[var(--border)] bg-[var(--card)]/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isHome ? "text-white/80" : "text-[var(--muted)]"}`}>© 2026 Meet Matt</span>
            </div>
            
            <div className="flex items-center gap-6">
              <span className={`flex items-center gap-1.5 text-sm ${isHome ? "text-white/75" : "text-[var(--muted)]"}`}>
                Made with <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" /> @ VIBEST
              </span>
              <Link 
                href="/privacy" 
                className={`text-sm transition-colors ${isHome ? "text-white/75 hover:text-cyan-200" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className={`text-sm transition-colors ${isHome ? "text-white/75 hover:text-cyan-200" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
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
