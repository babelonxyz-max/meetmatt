"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { FEATURE_CHIPS } from "./constants"

interface StepFeaturesProps {
  agentName: string
  role: string
  onSubmit: (features: string[]) => void
}

export function StepFeatures({ agentName, role, onSubmit }: StepFeaturesProps) {
  const chips = FEATURE_CHIPS[role] || FEATURE_CHIPS.assistant
  const [selected, setSelected] = useState<string[]>([])
  const [custom, setCustom] = useState("")

  const toggle = (chip: string) => {
    setSelected(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip])
  }

  const handleSubmit = () => {
    const all = [...selected]
    if (custom.trim()) all.push(custom.trim())
    if (all.length > 0) onSubmit(all)
  }

  return (
    <>
      <div className="text-[#e8e6e0] text-xl font-medium max-w-[420px]">
        What should {agentName} handle?
      </div>
      <div className="text-[#666] text-[13px] max-w-[420px]">
        Pick what fits, or describe it yourself.
      </div>
      <div className="flex gap-2 flex-wrap max-w-[420px]">
        {chips.map(chip => {
          const active = selected.includes(chip)
          return (
            <motion.button
              key={chip}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggle(chip)}
              className={`rounded-full px-4 py-2 text-[13px] border transition-colors ${
                active
                  ? "border-[#ff6b35] text-[#ff6b35] bg-[#1a1a22]"
                  : "border-[#2a2a35] text-[#888] bg-[#1a1a22] hover:border-[#444]"
              }`}
            >
              {active ? "✓ " : ""}{chip}
            </motion.button>
          )
        })}
      </div>
      <div className="max-w-[420px] bg-[#0f0f17] border border-[#222] rounded-[14px] p-3.5 flex items-center gap-3">
        <input
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder={`Or describe what ${agentName} should do...`}
          className="flex-1 bg-transparent text-sm text-[#e8e6e0] placeholder:text-[#444] outline-none"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSubmit}
          disabled={selected.length === 0 && !custom.trim()}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ffaa44] flex items-center justify-center text-white text-sm disabled:opacity-30"
        >
          →
        </motion.button>
      </div>
    </>
  )
}
