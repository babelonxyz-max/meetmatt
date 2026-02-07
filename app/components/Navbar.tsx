"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User, ChevronDown, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useRef, useEffect } from "react";

export function Navbar() {
  const { authenticated, login, logout, user } = usePrivy();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get display text for user
  const getUserDisplay = () => {
    if (!user) return null;
    
    const email = user.email?.address;
    const wallet = user.wallet?.address;
    
    if (email) {
      // Truncate email if too long
      return email.length > 20 ? email.slice(0, 17) + "..." : email;
    }
    
    if (wallet) {
      // Show shortened wallet address
      return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
    }
    
    return "Account";
  };

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
        {authenticated ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 text-lg text-[var(--foreground)] hover:text-[var(--accent)] transition-colors px-3 py-2 rounded-lg hover:bg-[var(--card)]"
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline max-w-[150px] truncate">
                {getUserDisplay()}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
            </button>
            
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden"
                >
                  <Link
                    href="/dashboard"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-4 py-3 text-[var(--foreground)] hover:bg-[var(--card)]/80 transition-colors"
                  >
                    <span>Dashboard</span>
                  </Link>
                  <div className="border-t border-[var(--border)]" />
                  <button
                    onClick={() => {
                      logout();
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
