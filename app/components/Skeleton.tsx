"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <motion.div
      className={`bg-white/5 rounded-lg ${className}`}
      animate={{
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      <Skeleton className="w-3/4 h-5 mb-1" />
      <Skeleton className="w-1/2 h-4 mb-4" />
      <Skeleton className="w-2/3 h-3" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white pt-20 pb-12 px-4 max-w-6xl mx-auto">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-64 h-4" />
        </div>
        <Skeleton className="w-32 h-10 rounded-lg" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <AgentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
