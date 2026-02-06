"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { usePrivy } from "@privy-io/react-auth";

export function Navbar() {
  const { authenticated, login, logout } = usePrivy();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 sm:h-20 flex items-center justify-between px-6 sm:px-8 bg-[var(--background)] z-[100] border-b border-[var(--border)]">
      <Link href="/" className="flex items-center gap-3">
        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
          <Sparkles className="w-7 h-7 text-[var(--accent)]" />
        </motion.div>
        <span className="font-bold text-2xl tracking-tight">Matt</span>
      </Link>
      
      <nav className="flex items-center gap-6">
        <Link href="/pricing" className="text-lg text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
          Pricing
        </Link>
        <ThemeToggle />
        {authenticated ? (
          <>
            <Link href="/dashboard" className="text-lg text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
              Dashboard
            </Link>
            <button 
              onClick={() => logout()} 
              className="flex items-center gap-2 text-lg text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </>
        ) : (
          <button 
            onClick={login} 
            className="flex items-center gap-2 text-lg text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="hidden sm:inline">Log in</span>
          </button>
        )}
      </nav>
    </header>
  );
}
