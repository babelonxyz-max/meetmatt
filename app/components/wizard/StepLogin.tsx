"use client"
import { motion } from "framer-motion"

interface StepLoginProps {
  agentName: string
  onLogin: () => void
}

export function StepLogin({ agentName, onLogin }: StepLoginProps) {
  return (
    <>
      <div className="text-[#e8e6e0] text-xl font-medium max-w-[420px]">
        Let&apos;s save your progress.
      </div>
      <div className="text-[#888] text-sm max-w-[420px] leading-relaxed">
        Sign in so {agentName} is ready when you come back.
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onLogin}
        className="max-w-[420px] w-full bg-gradient-to-r from-[#ff6b35] to-[#ffaa44] rounded-xl p-3.5 text-white text-[15px] font-semibold text-center hover:opacity-90 transition-opacity"
      >
        Sign in to continue
      </motion.button>
      <div className="text-[#555] text-xs max-w-[420px]">
        Google, email, or wallet — your choice.
      </div>
    </>
  )
}
