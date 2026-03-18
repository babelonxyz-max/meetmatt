"use client"
import { useId } from "react"
import { motion } from "framer-motion"
import { ROLE_OPTIONS } from "./constants"

// Brand icons — each gets a unique gradient ID via the component's useId
const ICON_PATHS: Record<string, React.ReactNode> = {
  assistant: <><path d="M12 2a7 7 0 0 1 7 7v1a7 7 0 0 1-14 0V9a7 7 0 0 1 7-7z"/><path d="M8 21h8"/><path d="M12 17v4"/></>,
  employee: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/><circle cx="12" cy="14" r="2"/></>,
  coworker: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  frontdesk: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
}

function RoleIcon({ roleId }: { roleId: string }) {
  const id = useId()
  const gradId = `role-grad-${id}`
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={`url(#${gradId})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <defs><linearGradient id={gradId} x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor="#FF6B35"/><stop offset="100%" stopColor="#FFAA44"/></linearGradient></defs>
      {ICON_PATHS[roleId]}
    </svg>
  )
}

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
            className="bg-[#1a1a22] border border-[#2a2a35] rounded-[14px] p-4 text-left hover:border-[#ff6b35] hover:shadow-[0_0_20px_rgba(255,107,53,0.1)] transition-all group"
          >
            <div className="mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
              <RoleIcon roleId={role.id} />
            </div>
            <div className="text-[#e0ded8] text-sm font-medium">{role.label}</div>
            <div className="text-[#555] text-[11px] mt-1">{role.desc}</div>
          </motion.button>
        ))}
      </div>
    </>
  )
}
