"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-80px)] bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="relative mb-8">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-3xl"
          />
          <div className="relative flex items-center justify-center">
            <AlertTriangle className="w-20 h-20 text-red-500" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-[var(--foreground)]">
          Something went wrong
        </h1>
        <p className="text-[var(--muted)] mb-2">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-sm text-[var(--muted)] mb-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[var(--border)] rounded-xl hover:bg-[var(--card)] transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
