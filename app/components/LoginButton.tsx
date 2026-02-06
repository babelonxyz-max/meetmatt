"use client";

import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { User, LogOut } from "lucide-react";

export default function LoginButton() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-20 bg-[var(--muted)]/20 rounded-full animate-pulse" />
    );
  }

  return <LoginButtonInner />;
}

function LoginButtonInner() {
  const { authenticated, user, logout } = usePrivy();
  const [isOpen, setIsOpen] = useState(false);
  
  const { login } = useLogin({
    onComplete: () => console.log("[Auth] Login complete"),
    onError: (error) => console.error("[Auth] Login error:", error),
  });

  if (authenticated && user) {
    const display = user.email?.address || 
                   (user.wallet?.address ? 
                    `${user.wallet.address.slice(0, 4)}...${user.wallet.address.slice(-4)}` : 
                    "User");

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)] transition-all duration-200"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-medium text-[var(--foreground)] max-w-[120px] truncate hidden sm:block">
            {display}
          </span>
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50">
            <a 
              href="/dashboard" 
              className="block px-4 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]/10 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </a>
            <button
              onClick={() => { logout(); setIsOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
        
        {isOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-full transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
    >
      Sign In
    </button>
  );
}
