"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandMark } from "./components/BrandMark";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-80px)] bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        {/* 404 with animated orb effect */}
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
            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ffaa44] blur-3xl"
          />
          <h1 className="gradient-text relative text-8xl font-bold">
            404
          </h1>
        </div>

        <h2 className="text-2xl font-semibold mb-2 text-[var(--foreground)]">Page not found</h2>
        <p className="text-[var(--muted)] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="brand-button border-0 text-white hover:opacity-95">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="border-white/10 hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Decorative elements */}
        <div className="mt-12 flex items-center justify-center">
          <BrandMark iconClassName="h-5 w-5" wordmarkClassName="text-sm" />
        </div>
      </motion.div>
    </div>
  );
}
