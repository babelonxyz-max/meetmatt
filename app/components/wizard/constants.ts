import type { Step } from "./types"

type OrbState = "idle" | "speaking" | "listening" | "thinking"

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

export const NAME_SUGGESTIONS = ["Jarvis", "Eva", "Nova", "Sage"]

export const STEP_ORDER: Step[] = ["name", "role", "features", "login", "token", "deploy"]

export function getOrbState(step: Step): OrbState {
  switch (step) {
    case "name": case "role": case "features": return "speaking"
    case "login": return "idle"
    case "token": return "listening"
    case "deploy": return "thinking"
    default: return "idle"
  }
}
