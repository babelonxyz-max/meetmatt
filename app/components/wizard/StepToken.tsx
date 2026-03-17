"use client"
import { useState } from "react"
import { motion } from "framer-motion"

interface StepTokenProps {
  agentName: string
  isValidating: boolean
  botHandle: string | null
  error: string | null
  onSubmit: (token: string) => void
}

export function StepToken({ agentName, isValidating, botHandle, error, onSubmit }: StepTokenProps) {
  const [value, setValue] = useState("")

  if (botHandle) {
    return (
      <div className="max-w-[420px] bg-[#0f1a0f] border border-[#1a3a1a] rounded-xl p-3 flex items-center gap-2.5">
        <span className="text-[#4ade80] text-base">✓</span>
        <div>
          <div className="text-[#4ade80] text-[13px] font-medium">@{botHandle}</div>
          <div className="text-[#555] text-[11px]">Verified — ready to deploy</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="text-[#e8e6e0] text-xl font-medium max-w-[420px]">
        Now let&apos;s connect {agentName} to Telegram.
      </div>
      <div className="text-[#888] text-sm max-w-[420px] leading-relaxed">
        Open <span className="text-[#ff6b35]">@BotFather</span> on Telegram, create a bot, and paste the token here.
      </div>
      <div className="max-w-[420px] bg-[#0f0f17] border border-[#222] rounded-[14px] p-3.5 flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && value.trim() && onSubmit(value.trim())}
          placeholder="Paste bot token..."
          className="flex-1 bg-transparent text-sm text-[#e8e6e0] placeholder:text-[#444] outline-none font-mono"
          disabled={isValidating}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => value.trim() && onSubmit(value.trim())}
          disabled={!value.trim() || isValidating}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ffaa44] flex items-center justify-center text-white text-sm disabled:opacity-30"
        >
          {isValidating ? "…" : "→"}
        </motion.button>
      </div>
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs max-w-[420px]">
          {error}
        </motion.div>
      )}
      <div className="text-[#555] text-xs max-w-[420px]">
        Don&apos;t have a bot yet?{" "}
        <a href="https://t.me/BotFather" target="_blank" rel="noopener" className="text-[#ff6b35] hover:underline">
          Open BotFather →
        </a>
      </div>
    </>
  )
}
