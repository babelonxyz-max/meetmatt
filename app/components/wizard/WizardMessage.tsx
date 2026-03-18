"use client"
import { motion } from "framer-motion"
import type { CompressionLevel, StepRecord } from "./types"
import React from "react"

interface WizardMessageProps {
  record: StepRecord
  compressionLevel: CompressionLevel
  isActive: boolean
  onEdit?: () => void
  children?: React.ReactNode
}

// Smooth, natural easing — not robotic
const smoothEase = [0.22, 0.68, 0.35, 1.0] as const

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.15,
    },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: smoothEase },
  },
} as const

export function WizardMessage({ record, compressionLevel, isActive, onEdit, children }: WizardMessageProps) {
  if (isActive) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4"
      >
        {record.mattMessage && (
          <motion.div
            variants={fadeUp}
            className="text-[#999] text-[15px] leading-relaxed max-w-[420px]"
          >
            {record.mattMessage}
          </motion.div>
        )}
        {React.Children.map(children, (child) => (
          <motion.div variants={fadeUp}>
            {child}
          </motion.div>
        ))}
      </motion.div>
    )
  }

  if (compressionLevel === "collapsed") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 0.35, y: 0 }}
        transition={{ duration: 0.45, ease: smoothEase }}
        className="cursor-pointer hover:opacity-50 transition-opacity duration-300"
        onClick={onEdit}
      >
        <div className="flex gap-4 text-xs text-[#555]">
          {record.icon && <span>{record.icon}</span>}
          <span>{record.displayAnswer}</span>
        </div>
      </motion.div>
    )
  }

  // compact mode — history record
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 0.5, y: 0 }}
      transition={{ duration: 0.5, ease: smoothEase }}
      className="cursor-pointer hover:opacity-70 transition-opacity duration-300 mb-5"
      onClick={onEdit}
    >
      <div className="text-[#666] text-[13px] leading-normal">{record.mattMessage}</div>
      <div className="inline-flex items-center gap-1.5 mt-1.5 bg-[#1a1a22] border border-[#2a2a35] rounded-[10px] px-3.5 py-1.5">
        {record.icon && <span className="text-sm">{record.icon}</span>}
        <span className="text-[#ff6b35] text-[13px] font-medium">{record.displayAnswer}</span>
      </div>
    </motion.div>
  )
}
