"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";

export function Footer() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <motion.footer 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className={isHome ? "fixed inset-x-0 bottom-0 z-50 h-14 border-t border-white/10 bg-[#070a12]/84 text-white backdrop-blur-2xl" : "relative z-40 pb-4"}
    >
      <div className={isHome ? "mx-auto flex h-full w-full max-w-7xl items-center px-4 sm:px-6" : "mx-4"}>
        <div
          className={isHome ? "w-full" : `brand-panel brand-noise mx-auto max-w-7xl rounded-2xl px-5 py-2.5 shadow-2xl shadow-black/50 backdrop-blur-xl ${isHome ? "text-white" : "text-[var(--foreground)]"}`}
        >
          <div className={`flex items-center justify-between gap-4 ${isHome ? "h-full" : "pointer-events-auto"}`}>
            <div className="flex items-center gap-3">
              <BrandMark iconClassName="h-6 w-6" wordmarkClassName="text-base" />
              <span className={`hidden text-sm lg:inline ${isHome ? "text-white/68" : "text-[var(--muted)]"}`}>
                Telegram-native operator layer
              </span>
            </div>
            
            <div className="flex items-center gap-4 sm:gap-6">
              <Link 
                href="/privacy" 
                className={`text-sm transition-colors ${isHome ? "text-white/75 hover:text-[#ffd6b2]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className={`text-sm transition-colors ${isHome ? "text-white/75 hover:text-[#ffd6b2]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                Terms
              </Link>
              <Link 
                href="/whitelabel" 
                className={`text-sm transition-colors ${isHome ? "text-white/75 hover:text-[#ffd6b2]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                Toolkit
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
