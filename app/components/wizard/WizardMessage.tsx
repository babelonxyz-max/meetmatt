"use client"
import { motion } from "framer-motion"
import type { CompressionLevel, StepRecord } from "./types"

interface WizardMessageProps {
  record: StepRecord
  compressionLevel: CompressionLevel
  isActive: boolean
  onEdit?: () => void
  children?: React.ReactNode
}

export function WizardMessage({ record, compressionLevel, isActive, onEdit, children }: WizardMessageProps) {
  if (isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col gap-3.5"
      >
        {record.mattMessage && (
          <div className="text-[#999] text-[15px] leading-relaxed max-w-[420px]">
            {record.mattMessage}
          </div>
        )}
        {children}
      </motion.div>
    )
  }

  if (compressionLevel === "collapsed") {
    return (
      <motion.div
        layout
        className="opacity-35 cursor-pointer hover:opacity-50 transition-opacity"
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
      className="opacity-50 cursor-pointer hover:opacity-70 transition-opacity mb-4"
      onClick={onEdit}
    >
      <div className="text-[#666] text-[13px] leading-normal">{record.mattMessage}</div>
      <div className="inline-flex items-center gap-1.5 mt-1 bg-[#1a1a22] border border-[#2a2a35] rounded-[10px] px-3.5 py-1.5">
        {record.icon && <span className="text-sm">{record.icon}</span>}
        <span className="text-[#ff6b35] text-[13px] font-medium">{record.displayAnswer}</span>
      </div>
    </motion.div>
  )
}
