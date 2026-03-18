# Wizard Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-panel wizard with a conversational flow — Orb left, chat thread right, mobile-optimized.

**Architecture:** Two-zone layout (Orb + WizardThread). WizardThread manages step history with progressive compression. Each step is a WizardMessage containing Matt's text + interactive content. State persisted to sessionStorage across Privy auth redirects.

**Tech Stack:** Next.js 16, React 19, Framer Motion 12, TailwindCSS 4, Privy, existing PaymentModal + Telegram validation APIs.

**Spec:** `docs/superpowers/specs/2026-03-17-wizard-redesign-design.md`

---

### Task 1: Types & Shared Utilities

**Files:**
- Rewrite: `app/components/wizard/types.ts`
- Create: `app/components/wizard/constants.ts`
- Create: `app/hooks/useIsMobile.ts`

- [ ] **Step 1: Replace types.ts**

```typescript
// app/components/wizard/types.ts
export type Step = "idle" | "name" | "role" | "features" | "login" | "token" | "deploy"

export type OrbSize = "sm" | "md" | "lg"

export interface StepRecord {
  step: Step
  mattMessage: string
  userAnswer: string | string[]
  displayAnswer: string
  icon?: string
  timestamp: number
}

export interface WizardConfig {
  currentStep: Step
  history: StepRecord[]
  agentName: string
  role: string
  features: string[]
  isAuthenticated: boolean
  botToken: string | null
  botHandle: string | null
  launchOffer: "day_pass" | "monthly" | null
  deployStatus: "idle" | "deploying" | "completed" | "failed"
}

export type CompressionLevel = "full" | "compact" | "collapsed"

export interface WizardMessageProps {
  record: StepRecord
  compressionLevel: CompressionLevel
  isActive: boolean
  onEdit?: () => void
  children?: React.ReactNode
}
```

- [ ] **Step 2: Create constants.ts**

```typescript
// app/components/wizard/constants.ts
export const ROLE_OPTIONS = [
  { id: "assistant", emoji: "🤖", label: "Assistant", desc: "Answers questions, runs tasks" },
  { id: "employee", emoji: "👔", label: "Employee", desc: "Works a shift, handles ops" },
  { id: "coworker", emoji: "🤝", label: "Coworker", desc: "Collaborates, shares context" },
  { id: "frontdesk", emoji: "📞", label: "Front Desk", desc: "First contact, routes & greets" },
] as const

export const FEATURE_CHIPS: Record<string, string[]> = {
  assistant: ["Research", "Summarization", "Writing", "Code help", "Data analysis", "Scheduling"],
  employee: ["Customer support", "Order tracking", "Lead qualification", "Appointment booking", "FAQ answers", "Onboarding"],
  coworker: ["Brainstorming", "Document review", "Meeting prep", "Status updates", "Knowledge base", "Reporting"],
  frontdesk: ["Greeting", "Routing", "Intake forms", "Availability check", "FAQ", "Escalation"],
}

export const NAME_SUGGESTIONS = ["Ada", "Relay", "Friday", "Atlas"]

export const STEP_ORDER: Step[] = ["name", "role", "features", "login", "token", "deploy"]

import type { Step } from "./types"
type OrbState = "idle" | "speaking" | "listening" | "thinking"

export function getOrbState(step: Step): OrbState {
  switch (step) {
    case "name": case "role": case "features": return "speaking"
    case "login": return "idle"
    case "token": return "listening"
    case "deploy": return "thinking"
    default: return "idle"
  }
}
```

- [ ] **Step 3: Create useIsMobile hook**

```typescript
// app/hooks/useIsMobile.ts
"use client"
import { useState, useEffect } from "react"

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [breakpoint])
  return isMobile
}
```

- [ ] **Step 4: Commit**

```bash
git add app/components/wizard/types.ts app/components/wizard/constants.ts app/hooks/useIsMobile.ts
git commit -m "feat(wizard): new types, constants, and useIsMobile hook for conversational redesign"
```

---

### Task 2: WizardMessage Component

**Files:**
- Create: `app/components/wizard/WizardMessage.tsx`

- [ ] **Step 1: Create WizardMessage**

This component renders a single step in either active (full UI), compact (1-step-back), or collapsed (3+ steps back) mode.

```typescript
// app/components/wizard/WizardMessage.tsx
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
        <div className="text-[10px] text-[#333] tracking-[2px] uppercase">
          {/* Step indicator injected by parent */}
        </div>
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
  const opacity = compressionLevel === "compact" ? "opacity-50" : "opacity-60"
  return (
    <motion.div
      layout
      className={`${opacity} cursor-pointer hover:opacity-70 transition-opacity mb-4`}
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
```

- [ ] **Step 2: Commit**

```bash
git add app/components/wizard/WizardMessage.tsx
git commit -m "feat(wizard): WizardMessage component with compression levels"
```

---

### Task 3: WizardThread Component

**Files:**
- Create: `app/components/wizard/WizardThread.tsx`

- [ ] **Step 1: Create WizardThread**

Manages the conversation thread — history + active step, scroll position, compression logic.

```typescript
// app/components/wizard/WizardThread.tsx
"use client"
import { useRef, useEffect, useCallback } from "react"
import { AnimatePresence } from "framer-motion"
import { useIsMobile } from "@/app/hooks/useIsMobile"
import { WizardMessage } from "./WizardMessage"
import type { StepRecord, CompressionLevel, Step } from "./types"
import { STEP_ORDER } from "./constants"

interface WizardThreadProps {
  history: StepRecord[]
  currentStep: Step
  stepIndicator: string
  onEditStep: (step: Step) => void
  children: React.ReactNode  // Active step content
  mattMessage?: string
}

function getCompressionLevel(stepsBack: number, isMobile: boolean): CompressionLevel {
  if (isMobile) {
    if (stepsBack <= 1) return "compact"
    return "collapsed"
  }
  if (stepsBack <= 1) return "compact"
  if (stepsBack === 2) return "compact"
  return "collapsed"
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

  // Collapsed history line for 3+ steps back
  const collapsedEntries = history.filter((_, i) => {
    const stepsBack = history.length - i
    return getCompressionLevel(stepsBack, isMobile) === "collapsed"
  })

  const compactEntries = history.filter((_, i) => {
    const stepsBack = history.length - i
    return getCompressionLevel(stepsBack, isMobile) !== "collapsed"
  })

  const collapsedLine = collapsedEntries.length > 0
    ? collapsedEntries.map(r => r.displayAnswer).join(" · ")
    : null

  return (
    <div
      ref={scrollRef}
      onScroll={checkAtBottom}
      className="flex flex-col justify-end min-h-full overflow-y-auto px-6 md:px-0 md:pr-12"
    >
      {/* Gradient fade at top */}
      <div className="sticky top-0 h-[60px] bg-gradient-to-b from-[#0a0a0f] to-transparent z-10 pointer-events-none -mb-[60px]" />

      <div className="flex flex-col gap-0 pt-16">
        {/* Collapsed history line */}
        {collapsedLine && (
          <div className="opacity-35 text-xs text-[#555] mb-3.5 flex gap-4 flex-wrap">
            {collapsedEntries.map((r, i) => (
              <span key={r.step} className="cursor-pointer hover:opacity-60" onClick={() => onEditStep(r.step)}>
                {r.icon} {r.displayAnswer}
              </span>
            ))}
          </div>
        )}

        {/* Compact history entries */}
        {compactEntries.map((record, i) => {
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

        {/* Divider between history and active step */}
        {history.length > 0 && (
          <div className="h-px bg-gradient-to-r from-transparent via-[#222] to-transparent mb-5" />
        )}

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
```

- [ ] **Step 2: Commit**

```bash
git add app/components/wizard/WizardThread.tsx
git commit -m "feat(wizard): WizardThread with history compression and scroll management"
```

---

### Task 4: Step Components (Name, Role, Features)

**Files:**
- Rewrite: `app/components/wizard/StepName.tsx`
- Create: `app/components/wizard/StepRole.tsx`
- Create: `app/components/wizard/StepFeatures.tsx`

- [ ] **Step 1: Rewrite StepName**

```typescript
// app/components/wizard/StepName.tsx
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
```

- [ ] **Step 2: Create StepRole**

```typescript
// app/components/wizard/StepRole.tsx
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
```

- [ ] **Step 3: Create StepFeatures**

```typescript
// app/components/wizard/StepFeatures.tsx
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
```

- [ ] **Step 4: Commit**

```bash
git add app/components/wizard/StepName.tsx app/components/wizard/StepRole.tsx app/components/wizard/StepFeatures.tsx
git commit -m "feat(wizard): StepName, StepRole, StepFeatures components"
```

---

### Task 5: Step Components (Login, Token, Deploy)

**Files:**
- Create: `app/components/wizard/StepLogin.tsx`
- Create: `app/components/wizard/StepToken.tsx`
- Rewrite: `app/components/wizard/StepDeploy.tsx`

- [ ] **Step 1: Create StepLogin**

```typescript
// app/components/wizard/StepLogin.tsx
"use client"
import { motion } from "framer-motion"

interface StepLoginProps {
  agentName: string
  onGoogle: () => void
  onEmail: () => void
  onWallet: () => void
}

export function StepLogin({ agentName, onGoogle, onEmail, onWallet }: StepLoginProps) {
  return (
    <>
      <div className="text-[#e8e6e0] text-xl font-medium max-w-[420px]">
        Let&apos;s save your progress.
      </div>
      <div className="text-[#888] text-sm max-w-[420px] leading-relaxed">
        Sign in so {agentName} is ready when you come back.
      </div>
      <div className="flex flex-col gap-2.5 max-w-[420px] mt-1">
        <motion.button whileTap={{ scale: 0.98 }} onClick={onGoogle}
          className="bg-white rounded-xl p-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          <span className="text-[#333] text-sm font-medium">Continue with Google</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }} onClick={onEmail}
          className="bg-[#1a1a22] border border-[#2a2a35] rounded-xl p-3.5 flex items-center gap-3 hover:border-[#444] transition-colors">
          <span className="text-base">📧</span>
          <span className="text-[#ccc] text-sm">Continue with email</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }} onClick={onWallet}
          className="bg-[#1a1a22] border border-[#2a2a35] rounded-xl p-3.5 flex items-center gap-3 hover:border-[#444] transition-colors">
          <span className="text-base">👛</span>
          <span className="text-[#ccc] text-sm">Connect wallet</span>
        </motion.button>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create StepToken**

```typescript
// app/components/wizard/StepToken.tsx
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
```

- [ ] **Step 3: Rewrite StepDeploy**

```typescript
// app/components/wizard/StepDeploy.tsx
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
        <a href={telegramLink} target="_blank" rel="noopener"
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

  // idle — show summary + CTAs
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
```

- [ ] **Step 4: Commit**

```bash
git add app/components/wizard/StepLogin.tsx app/components/wizard/StepToken.tsx app/components/wizard/StepDeploy.tsx
git commit -m "feat(wizard): StepLogin, StepToken, StepDeploy components"
```

---

### Task 6: NexusOrb Size Prop

**Files:**
- Modify: `app/components/NexusOrb.tsx` (lines 9–17 props, line 159 default sizing)

- [ ] **Step 1: Add size prop to NexusOrb**

Add `size` to the existing props interface. Map it to Tailwind classes internally. Keep all existing props working.

In `app/components/NexusOrb.tsx`, add to the interface (line ~12):
```typescript
size?: "sm" | "md" | "lg"
```

Add a size map before the component return (around line 50):
```typescript
const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-40 w-40",
  lg: "h-[200px] w-[200px]",
}
const orbSize = props.size ? sizeClasses[props.size] : props.orbClassName || "h-48 w-48 md:h-64 md:w-64"
```

Replace the existing `orbClassName` usage in the orb div's className with `orbSize`.

- [ ] **Step 2: Verify existing usage still works**

Run: `npx next build 2>&1 | head -30`
Expected: No type errors related to NexusOrb.

- [ ] **Step 3: Commit**

```bash
git add app/components/NexusOrb.tsx
git commit -m "feat(NexusOrb): add size prop (sm/md/lg) for responsive wizard layout"
```

---

### Task 7: Integrate WizardThread into page.tsx

**Files:**
- Modify: `app/page.tsx` (major rewrite of wizard section, lines 110–115, 151–209, 909–1090)

This is the largest task — rewiring the page to use the new conversational layout.

- [ ] **Step 1: Add imports and new state**

At the top of `app/page.tsx`, replace wizard imports:
```typescript
// Remove old imports:
// import { GuideRail, ConversationSpine, LiveCanvas, StateBanner, RecoveryPanel } from "./components/wizard/WizardChrome"
// import { StepPersonality } from "./components/wizard/StepPersonality"
// import { StepDemo } from "./components/wizard/StepDemo"

// Add new imports:
import { WizardThread } from "./components/wizard/WizardThread"
import { StepName } from "./components/wizard/StepName"
import { StepRole } from "./components/wizard/StepRole"
import { StepFeatures } from "./components/wizard/StepFeatures"
import { StepLogin } from "./components/wizard/StepLogin"
import { StepToken } from "./components/wizard/StepToken"
import { StepDeploy } from "./components/wizard/StepDeploy"
import { getOrbState, STEP_ORDER } from "./components/wizard/constants"
import type { Step, StepRecord, WizardConfig } from "./components/wizard/types"
import { useIsMobile } from "./hooks/useIsMobile"
```

- [ ] **Step 2: Replace wizard state hooks**

Remove the old `getWizardState()` function (lines 151–178) and `getOrbState()` (lines 110–115).

Replace the wizard useState hooks (lines 182–209) with:
```typescript
const [step, setStep] = useState<Step>("idle")
const [history, setHistory] = useState<StepRecord[]>([])
const [agentName, setAgentName] = useState("")
const [role, setRole] = useState("")
const [features, setFeatures] = useState<string[]>([])
const [botToken, setBotToken] = useState<string | null>(null)
const [botHandle, setBotHandle] = useState<string | null>(null)
const [launchOffer, setLaunchOffer] = useState<"day_pass" | "monthly" | null>(null)
// Keep existing: deployStatus, deployProgress, telegramLink, showPaymentModal,
// telegramBotError, isValidatingTelegramBot, pendingAgentId, launchPricing, etc.
const isMobile = useIsMobile()
```

- [ ] **Step 3: Add sessionStorage persistence for auth redirects**

```typescript
const WIZARD_STORAGE_KEY = "meetmatt-wizard-state"

// Save before auth redirect
const saveWizardState = () => {
  const state = { step, history, agentName, role, features, botToken, botHandle }
  sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state))
}

// Restore on mount (after auth redirect)
useEffect(() => {
  if (authenticated) {
    const saved = sessionStorage.getItem(WIZARD_STORAGE_KEY)
    if (saved) {
      const s = JSON.parse(saved)
      setStep("token") // advance past login
      setHistory(prev => [...s.history, {
        step: "login", mattMessage: "Let's save your progress.",
        userAnswer: user?.email?.address || "Connected",
        displayAnswer: `✓ ${user?.email?.address || "Signed in"}`,
        timestamp: Date.now()
      }])
      setAgentName(s.agentName)
      setRole(s.role)
      setFeatures(s.features)
      sessionStorage.removeItem(WIZARD_STORAGE_KEY)
    }
  }
}, [authenticated])
```

- [ ] **Step 4: Add step advancement helpers**

```typescript
const advanceStep = (fromStep: Step, answer: string | string[], displayAnswer: string, icon?: string) => {
  const mattMessages: Record<Step, string> = {
    idle: "", name: "What should we call them?",
    role: `${agentName} — great name. What role will ${agentName} play?`,
    features: `An ${role} — solid. What should ${agentName} handle?`,
    login: "Let's save your progress.",
    token: `Now let's connect ${agentName} to Telegram.`,
    deploy: `${agentName} is ready to go live.`,
  }

  setHistory(prev => [...prev, {
    step: fromStep, mattMessage: mattMessages[fromStep],
    userAnswer: answer, displayAnswer, icon, timestamp: Date.now()
  }])

  const nextIdx = STEP_ORDER.indexOf(fromStep) + 1
  if (nextIdx < STEP_ORDER.length) setStep(STEP_ORDER[nextIdx])
}

const handleEditStep = (targetStep: Step) => {
  const idx = history.findIndex(h => h.step === targetStep)
  if (idx >= 0) {
    setHistory(prev => prev.slice(0, idx))
    setStep(targetStep)
  }
}
```

- [ ] **Step 5: Replace wizard JSX**

Replace the entire wizard rendering section (lines 909–1090) with the new two-zone layout:

```tsx
{step !== "idle" && (
  <div className="min-h-screen flex flex-col md:flex-row" data-home-wizard-active>
    {/* Orb zone */}
    <div className={`
      ${isMobile ? "flex items-center justify-center py-8 sticky top-0 z-20 bg-[#0a0a0f]" : "w-[45%] flex items-center justify-center relative overflow-hidden"}
    `}>
      <div className={`absolute ${isMobile ? "w-[120px] h-[120px]" : "w-[320px] h-[320px]"} rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.15)_0%,rgba(255,107,53,0.05)_40%,transparent_70%)] blur-[40px]`} />
      <NexusOrb
        size={isMobile ? "sm" : "lg"}
        state={getOrbState(step)}
      />
      {!isMobile && (
        <div className="absolute bottom-[50px] text-[#444] text-[11px] tracking-[3px] uppercase">MATT</div>
      )}
    </div>

    {/* Conversation zone */}
    <div className={`${isMobile ? "flex-1" : "w-[55%]"} flex flex-col justify-end min-h-screen`}>
      <WizardThread
        history={history}
        currentStep={step}
        stepIndicator={`Step ${STEP_ORDER.indexOf(step) + 1} of ${STEP_ORDER.length}`}
        onEditStep={handleEditStep}
        mattMessage={step === "name" ? "Hey — I'm Matt. I'll help you build and deploy your AI agent in about two minutes." : undefined}
      >
        {step === "name" && (
          <StepName onSubmit={name => { setAgentName(name); advanceStep("name", name, name) }} />
        )}
        {step === "role" && (
          <StepRole agentName={agentName} onSelect={r => { setRole(r); advanceStep("role", r, r, ROLE_OPTIONS.find(o => o.id === r)?.emoji) }} />
        )}
        {step === "features" && (
          <StepFeatures agentName={agentName} role={role} onSubmit={f => { setFeatures(f); advanceStep("features", f, f.join(", ")) }} />
        )}
        {step === "login" && (
          <StepLogin
            agentName={agentName}
            onGoogle={() => { saveWizardState(); login() }}
            onEmail={() => { saveWizardState(); login() }}
            onWallet={() => { saveWizardState(); login() }}
          />
        )}
        {step === "token" && (
          <StepToken
            agentName={agentName}
            isValidating={isValidatingTelegramBot}
            botHandle={botHandle}
            error={telegramBotError}
            onSubmit={async (token) => {
              // existing validation logic from handleTelegramTokenSubmit
              setBotToken(token)
              // ... validate and set botHandle
              advanceStep("token", token, `@${botHandle}`, "✓")
            }}
          />
        )}
        {step === "deploy" && (
          <StepDeploy
            agentName={agentName}
            role={role}
            features={features}
            botHandle={botHandle}
            deployStatus={deployStatus}
            progress={deployProgress}
            telegramLink={telegramLink}
            onDeploy={(offer) => {
              setLaunchOffer(offer)
              setShowPaymentModal(true)
            }}
            onRetry={() => handlePaymentContinue()}
          />
        )}
      </WizardThread>
    </div>

    {/* PaymentModal — unchanged, stays as overlay */}
    <PaymentModal
      isOpen={showPaymentModal}
      onClose={() => setShowPaymentModal(false)}
      config={{ agentName, useCase: features.join(", "), scope: role, contactMethod: "telegram", telegramBotUsername: botHandle || undefined }}
      launchOffer={launchOffer || "day_pass"}
      agentId={pendingAgentId}
      pricing={launchPricing}
      onSuccess={handlePaymentSuccess}
    />
  </div>
)}
```

- [ ] **Step 6: Verify build**

Run: `cd /Users/mark/meetmatt && npx next build 2>&1 | tail -20`
Expected: Build succeeds without errors.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx
git commit -m "feat(wizard): conversational flow integration — Orb left, chat thread right"
```

---

### Task 8: Remove Old Files & CSS

**Files:**
- Delete: `app/components/wizard/WizardChrome.tsx`
- Delete: `app/components/wizard/StepPersonality.tsx`
- Delete: `app/components/wizard/StepDemo.tsx`
- Delete: `app/components/wizard/StepPayment.tsx` (replaced by StepDeploy with inline summary)
- Modify: `app/globals.css` (remove `.wizard-*` classes, lines 257–837)

- [ ] **Step 1: Delete removed files**

```bash
cd /Users/mark/meetmatt
rm app/components/wizard/WizardChrome.tsx
rm app/components/wizard/StepPersonality.tsx
rm app/components/wizard/StepDemo.tsx
rm app/components/wizard/StepPayment.tsx
```

- [ ] **Step 2: Remove .wizard-* CSS from globals.css**

Remove all `.wizard-*` class definitions (approximately lines 257–837). Keep all `.brand-*` classes and everything before/after the wizard section.

- [ ] **Step 3: Remove stale imports from page.tsx**

Search for any remaining imports of deleted components and remove them. Also remove `getWizardState` function if still present.

- [ ] **Step 4: Verify build**

Run: `cd /Users/mark/meetmatt && npx next build 2>&1 | tail -20`
Expected: Build succeeds. No references to deleted files.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(wizard): remove old 3-panel layout, personality picker, demo chat, and wizard CSS"
```

---

### Task 9: Visual QA & Polish

**Files:**
- May touch any wizard component for fixes

- [ ] **Step 1: Run dev server and visual test**

```bash
cd /Users/mark/meetmatt && npm run dev
```

Open http://localhost:3000. Click the CTA to start the wizard. Walk through all 6 steps and verify:
- Orb renders left on desktop, top on mobile
- Step 1 shows name suggestions and input
- Step 2 shows role cards in 2x2 grid
- Step 3 shows dynamic chips for selected role
- Completed steps compress into history
- History fades and collapses correctly
- Transitions are smooth (no flicker, no layout jumps)

- [ ] **Step 2: Test mobile layout**

Use browser DevTools responsive mode at 375px width. Verify:
- Orb is 64px, sticky at top
- Conversation fills remaining viewport
- Cards and inputs are full-width
- Touch targets are at least 44px
- History compresses more aggressively (2+ steps → collapsed)

- [ ] **Step 3: Fix any visual issues found**

Address spacing, alignment, color, or transition issues discovered during testing.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix(wizard): visual polish from QA pass"
```
