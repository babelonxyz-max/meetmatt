"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-6 px-4 border-t border-[var(--border)] bg-[var(--background)]/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--muted)]">© 2025 Matt AI</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link 
            href="/privacy" 
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Privacy Policy
          </Link>
          <Link 
            href="/terms" 
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Terms of Service
          </Link>
          <Link 
            href="mailto:support@meetmatt.xyz" 
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
