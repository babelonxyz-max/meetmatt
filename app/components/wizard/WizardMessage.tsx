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

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
} as const

export function WizardMessage({ record, compressionLevel, isActive, onEdit, children }: WizardMessageProps) {
  if (isActive) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3.5"
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 0.35, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="cursor-pointer hover:opacity-50 transition-opacity"
        onClick={onEdit}
      >
        <div className="flex gap-4 text-xs text-[#555]">
          {record.icon && <span>{record.icon}</span>}
          <span>{record.displayAnswer}</span>
        </div>
      </motion.div>
    )
  }

  // compact mode
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 0.5, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="cursor-pointer hover:opacity-70 transition-opacity mb-5"
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
