"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-4 px-6 sm:px-8 bg-[var(--background)] border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base text-[var(--muted)]">© 2026 Matt AI</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link 
            href="/privacy" 
            className="text-base text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Privacy Policy
          </Link>
          <Link 
            href="/terms" 
            className="text-base text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
