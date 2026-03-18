"use client"
import { useRef, useEffect, useCallback } from "react"
import { AnimatePresence } from "framer-motion"
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const wasAtBottom = useRef(true)

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    wasAtBottom.current = el.scrollTop >= el.scrollHeight - el.clientHeight - 50
  }, [])

  useEffect(() => {
    if (wasAtBottom.current && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [currentStep, history.length])

  const collapsedEntries = history.filter((_, i) => getCompressionLevel(history.length - i, isMobile) === "collapsed")
  const compactEntries = history.filter((_, i) => getCompressionLevel(history.length - i, isMobile) !== "collapsed")

  return (
    <div
      ref={scrollRef}
      onScroll={checkAtBottom}
      className="flex flex-col min-h-full overflow-y-auto"
    >
      <div className="flex flex-col gap-0">
        {/* Collapsed history line */}
        {collapsedEntries.length > 0 && (
          <div className="opacity-35 text-xs text-[#555] mb-3.5 flex gap-4 flex-wrap">
            {collapsedEntries.map(r => (
              <span key={r.step} className="cursor-pointer hover:opacity-60" onClick={() => onEditStep(r.step)}>
                {r.icon} {r.displayAnswer}
              </span>
            ))}
          </div>
        )}

        {/* Compact history entries */}
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

        {/* Active step */}
        <div ref={activeRef}>
          <AnimatePresence mode="popLayout">
            <WizardMessage
              key={currentStep}
              record={{ step: currentStep, mattMessage: mattMessage || "", userAnswer: "", displayAnswer: "", timestamp: Date.now() }}
              compressionLevel="full"
              isActive={true}
            >
              <div className="text-[10px] text-[#333] tracking-[2px] uppercase mb-3">
                {stepIndicator}
              </div>
              {children}
            </WizardMessage>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
