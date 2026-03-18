"use client"
import { useState } from "react"
import { motion } from "framer-motion"

interface StepDeployProps {
  agentName: string
  role: string
  features: string[]
  botHandle: string | null
  deployStatus: "idle" | "deploying" | "completed" | "failed"
  progress: number
  telegramLink?: string
  onDeploy: (offer: "day_pass" | "monthly") => void
  onRetry?: () => void
}

export function StepDeploy({ agentName, role, features, botHandle, deployStatus, progress, telegramLink, onDeploy, onRetry }: StepDeployProps) {
  const [termsAccepted, setTermsAccepted] = useState(false)

  if (deployStatus === "completed" && telegramLink) {
    return (
      <>
        <div className="text-[#e8e6e0] text-xl font-medium max-w-[420px]">
          {agentName} is live. 🎉
        </div>
        <a href={telegramLink} target="_blank" rel="noopener noreferrer"
          className="inline-flex max-w-[420px] bg-gradient-to-br from-[#ff6b35] to-[#ffaa44] rounded-xl p-3.5 text-white text-[15px] font-semibold justify-center hover:opacity-90 transition-opacity">
          Open in Telegram →
        </a>
      </>
    )
  }

  if (deployStatus === "deploying") {
    const steps = ["Connecting bot...", "Configuring responses...", "Going live..."]
    const activeIdx = progress < 33 ? 0 : progress < 66 ? 1 : 2
    return (
      <>
        <div className="text-[#e8e6e0] text-xl font-medium max-w-[420px]">
          Deploying {agentName}...
        </div>
        <div className="flex flex-col gap-2 max-w-[420px]">
          {steps.map((s, i) => (
            <div key={s} className={`text-sm ${i <= activeIdx ? "text-[#ff6b35]" : "text-[#333]"}`}>
              {i < activeIdx ? "✓ " : i === activeIdx ? "◉ " : "○ "}{s}
            </div>
          ))}
        </div>
      </>
    )
  }

  if (deployStatus === "failed") {
    return (
      <>
        <div className="text-[#e8e6e0] text-xl font-medium max-w-[420px]">
          Hit a snag — let me try again.
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onRetry}
          className="max-w-[420px] bg-gradient-to-br from-[#ff6b35] to-[#ffaa44] rounded-xl p-3.5 text-white text-[15px] font-semibold text-center">
          Retry Deploy
        </motion.button>
      </>
    )
  }

  return (
    <>
      <div className="text-[#e8e6e0] text-xl font-medium max-w-[420px]">
        {agentName} is ready to go live.
      </div>
      <div className="max-w-[420px] bg-[#1a1a22] border border-[#2a2a35] rounded-[14px] p-5 flex flex-col gap-2">
        <div className="flex justify-between text-[13px]"><span className="text-[#666]">Name</span><span className="text-[#ccc]">{agentName}</span></div>
        <div className="flex justify-between text-[13px]"><span className="text-[#666]">Role</span><span className="text-[#ccc] capitalize">{role}</span></div>
        <div className="flex justify-between text-[13px]"><span className="text-[#666]">Features</span><span className="text-[#ccc]">{features.slice(0, 3).join(", ")}{features.length > 3 ? ` +${features.length - 3}` : ""}</span></div>
        {botHandle && <div className="flex justify-between text-[13px]"><span className="text-[#666]">Bot</span><span className="text-[#ccc]">@{botHandle}</span></div>}
        <div className="h-px bg-[#2a2a35] my-1.5" />
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
            className="mt-0.5 accent-[#ff6b35]" />
          <span className="text-[11px] text-[#666] leading-relaxed">
            I agree to the <a href="/terms" className="text-[#ff6b35] hover:underline">Terms of Service</a>
          </span>
        </label>
      </div>
      <div className="flex gap-2.5 max-w-[420px] flex-col sm:flex-row">
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => onDeploy("day_pass")} disabled={!termsAccepted}
          className="flex-1 bg-gradient-to-br from-[#ff6b35] to-[#ffaa44] rounded-xl p-3.5 text-white text-[15px] font-semibold text-center disabled:opacity-30">
          Deploy {agentName} — $5/day
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => onDeploy("monthly")} disabled={!termsAccepted}
          className="border border-[#333] rounded-xl p-3.5 text-[#777] text-sm text-center disabled:opacity-30 hover:border-[#555] transition-colors">
          $150/mo
        </motion.button>
      </div>
    </>
  )
}
