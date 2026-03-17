"use client"
import { motion } from "framer-motion"
import { ROLE_OPTIONS } from "./constants"

interface StepRoleProps {
  agentName: string
  onSelect: (roleId: string) => void
}

export function StepRole({ agentName, onSelect }: StepRoleProps) {
  return (
    <>
      <div className="text-[#e8e6e0] text-xl font-medium max-w-[420px]">
        What role will {agentName} play?
      </div>
      <div className="grid grid-cols-2 gap-2.5 max-w-[420px] max-[360px]:grid-cols-1">
        {ROLE_OPTIONS.map(role => (
          <motion.button
            key={role.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(role.id)}
            className="bg-[#1a1a22] border border-[#2a2a35] rounded-[14px] p-4 text-left hover:border-[#ff6b35] hover:shadow-[0_0_20px_rgba(255,107,53,0.1)] transition-all"
          >
            <div className="text-xl mb-1.5">{role.emoji}</div>
            <div className="text-[#e0ded8] text-sm font-medium">{role.label}</div>
            <div className="text-[#555] text-[11px] mt-1">{role.desc}</div>
          </motion.button>
        ))}
      </div>
    </>
  )
}
