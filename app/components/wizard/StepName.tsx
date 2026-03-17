"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { NAME_SUGGESTIONS } from "./constants"

interface StepNameProps {
  onSubmit: (name: string) => void
}

export function StepName({ onSubmit }: StepNameProps) {
  const [value, setValue] = useState("")

  const handleSubmit = () => {
    const name = value.trim()
    if (name) onSubmit(name)
  }

  return (
    <>
      <div className="text-[#e8e6e0] text-xl font-medium max-w-[420px]">
        What should we call them?
      </div>
      <div className="flex gap-2 flex-wrap">
        {NAME_SUGGESTIONS.map(name => (
          <motion.button
            key={name}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSubmit(name)}
            className="bg-[#1a1a22] border border-[#2a2a35] rounded-full px-[18px] py-2 text-[#888] text-[13px] hover:border-[#ff6b35] hover:text-[#ff6b35] transition-colors"
          >
            {name}
          </motion.button>
        ))}
      </div>
      <div className="max-w-[420px] bg-[#0f0f17] border border-[#222] rounded-[14px] p-3.5 flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="Or type a name..."
          className="flex-1 bg-transparent text-sm text-[#e8e6e0] placeholder:text-[#444] outline-none"
          autoFocus
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ffaa44] flex items-center justify-center text-white text-sm disabled:opacity-30"
        >
          →
        </motion.button>
      </div>
    </>
  )
}
