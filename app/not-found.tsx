"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center p-4">
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
            className="absolute inset-0 bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] rounded-full blur-3xl"
          />
          <h1 className="relative text-8xl font-bold bg-gradient-to-r from-[#0ea5e9] to-[#6366f1] bg-clip-text text-transparent">
            404
          </h1>
        </div>

        <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
        <p className="text-zinc-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white">
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
        <div className="mt-12 flex items-center justify-center gap-2 text-zinc-600">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Meet Matt</span>
        </div>
      </motion.div>
    </div>
  );
}
