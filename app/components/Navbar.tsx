"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "./Button";
import { useState } from "react";

export function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[var(--background)]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-xl font-bold">Meet Matt</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">
              Dashboard
            </Link>
            
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400 text-sm">
                      {session.user?.email}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/auth/signin">
                      <Button variant="ghost" size="sm">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/pricing">
                      <Button size="sm">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <div className="flex flex-col gap-4">
              <Link
                href="/pricing"
                className="text-slate-300 hover:text-white transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/dashboard"
                className="text-slate-300 hover:text-white transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              
              {!isLoading && (
                <>
                  {isAuthenticated ? (
                    <>
                      <span className="text-slate-400 text-sm py-2">
                        {session.user?.email}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => {
                          signOut({ callbackUrl: "/" });
                          setMobileMenuOpen(false);
                        }}
                      >
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 pt-2">
                      <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" fullWidth>
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>
                        <Button fullWidth>
                          Get Started
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
