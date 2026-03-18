"use client"
import { useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { useIsMobile } from "@/app/hooks/useIsMobile"
import { WizardMessage } from "./WizardMessage"
import type { StepRecord, CompressionLevel, Step } from "./types"

interface WizardThreadProps {
  history: StepRecord[]
  currentStep: Step
  stepIndicator: string
  onEditStep: (step: Step) => void
  children: React.ReactNode
  mattMessage?: string
}

function getCompressionLevel(stepsBack: number, isMobile: boolean): CompressionLevel {
  if (isMobile) {
    return stepsBack <= 1 ? "compact" : "collapsed"
  }
  return stepsBack <= 2 ? "compact" : "collapsed"
}

export function WizardThread({ history, currentStep, stepIndicator, onEditStep, children, mattMessage }: WizardThreadProps) {
  const isMobile = useIsMobile()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Smooth scroll to bottom when step changes
  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, 100)
    return () => clearTimeout(timer)
  }, [currentStep, history.length])

  const collapsedEntries = history.filter((_, i) => getCompressionLevel(history.length - i, isMobile) === "collapsed")
  const compactEntries = history.filter((_, i) => getCompressionLevel(history.length - i, isMobile) !== "collapsed")

  const isFirstStep = history.length === 0

  return (
    <div className="flex flex-col min-h-full overflow-y-auto">
      <div className="flex flex-col">
        {/* Product context — visible only on first step, fades out as conversation progresses */}
        {isFirstStep && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 0.68, 0.35, 1.0] }}
            className="mb-8"
          >
            <h1 className="text-[clamp(1.5rem,3.2vw,2.4rem)] font-bold leading-[1.05] tracking-tight text-white mb-3">
              Your AI assistant,<br />
              <span className="bg-gradient-to-r from-[#ff6b35] to-[#ffaa44] bg-clip-text text-transparent">live in 2 minutes.</span>
            </h1>
            <p className="text-[#8a8a9a] text-[14px] leading-relaxed max-w-[400px] mb-4">
              Build, configure, and deploy an AI-powered assistant to Telegram. Matt walks you through the whole thing.
            </p>
            <div className="flex gap-4 text-[11px] text-[#555]">
              <span>No code needed</span>
              <span className="text-[#444]">·</span>
              <span>Works 24/7</span>
              <span className="text-[#444]">·</span>
              <span>Pay by card or crypto</span>
            </div>
          </motion.div>
        )}

        {/* Collapsed history */}
        {collapsedEntries.length > 0 && (
          <motion.div
            layout
            className="opacity-35 text-xs text-[#555] mb-4 flex gap-4 flex-wrap"
          >
            {collapsedEntries.map(r => (
              <span key={r.step} className="cursor-pointer hover:opacity-60 transition-opacity duration-300" onClick={() => onEditStep(r.step)}>
                {r.icon} {r.displayAnswer}
              </span>
            ))}
          </motion.div>
        )}

        {/* History entries — each animates in and stays */}
        {compactEntries.map(record => {
          const stepsBack = history.length - history.indexOf(record)
          return (
            <WizardMessage
              key={record.step}
              record={record}
              compressionLevel={getCompressionLevel(stepsBack, isMobile)}
              isActive={false}
              onEdit={() => onEditStep(record.step)}
            />
          )
        })}

        {/* Active step — no AnimatePresence, just motion with key */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 0.68, 0.35, 1.0] }}
        >
          <WizardMessage
            record={{ step: currentStep, mattMessage: mattMessage || "", userAnswer: "", displayAnswer: "", timestamp: Date.now() }}
            compressionLevel="full"
            isActive={true}
          >
            <div className="text-[10px] text-[#666] tracking-[2px] uppercase mb-3">
              {stepIndicator}
            </div>
            {children}
          </WizardMessage>
        </motion.div>

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  )
}
