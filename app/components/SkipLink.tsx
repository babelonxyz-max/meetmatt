"use client";

import Link from "next/link";

export function SkipLink() {
  return (
    <Link
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[9999] px-4 py-2 bg-[#0ea5e9] text-white rounded-lg"
    >
      Skip to main content
    </Link>
  );
}
