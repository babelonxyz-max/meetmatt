"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, ChevronDown, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";

export function Navbar() {
  const { authenticated, login, logout, user } = usePrivy();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";

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
    <header
      className={`fixed left-0 right-0 top-0 z-[100] flex items-center justify-between ${
        isHome
          ? "h-16 border-b border-white/10 bg-[#070a12]/68 px-6 text-white backdrop-blur-2xl"
          : "h-16 border-b border-white/8 bg-[#0b0e17]/78 px-6 text-[var(--foreground)] backdrop-blur-2xl sm:h-20 sm:px-8"
      }`}
    >
      <Link href="/" className="flex items-center gap-3">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <BrandMark
            glow={isHome}
            wordmarkClassName={isHome ? "text-[1.55rem] text-white" : "text-[1.55rem]"}
          />
        </motion.div>
      </Link>
      
      <nav className="flex items-center gap-3 sm:gap-5">
        <Link
          href="/pricing"
          className={`text-lg transition-colors ${isHome ? "text-white/82 hover:text-[#ffd6b2]" : "text-[var(--foreground)]/82 hover:text-[var(--accent-soft)]"}`}
        >
          Pricing
        </Link>
        <Link
          href="/whitelabel"
          className={`text-lg transition-colors ${isHome ? "text-white/82 hover:text-[#ffd6b2]" : "text-[var(--foreground)]/82 hover:text-[var(--accent-soft)]"}`}
        >
          Toolkit
        </Link>
        {authenticated ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-lg transition-colors ${
                isHome
                  ? "text-white/90 hover:bg-white/8 hover:text-[#ffd6b2]"
                  : "text-[var(--foreground)] hover:bg-white/8 hover:text-[var(--accent-soft)]"
              }`}
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
                  className={`absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border shadow-xl ${
                    isHome
                      ? "brand-panel brand-noise border-white/15 bg-[#0d1120]/92 backdrop-blur-xl"
                      : "brand-panel brand-noise"
                  }`}
                >
                  <Link
                    href="/dashboard"
                    onClick={() => setShowDropdown(false)}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isHome
                        ? "text-white/90 hover:bg-white/8"
                        : "text-[var(--foreground)] hover:bg-white/8"
                    }`}
                  >
                    <span>Dashboard</span>
                  </Link>
                  <div className={`border-t ${isHome ? "border-white/10" : "border-[var(--border)]"}`} />
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
            className={`flex items-center gap-2 text-lg transition-colors ${isHome ? "text-white/90 hover:text-[#ffd6b2]" : "text-[var(--foreground)] hover:text-[var(--accent-soft)]"}`}
          >
            <User className="w-5 h-5" />
            <span className="hidden sm:inline">Log in</span>
          </button>
        )}
      </nav>
    </header>
  );
}
