export type Step = "idle" | "name" | "role" | "features" | "login" | "token" | "deploy"

export type OrbSize = "sm" | "md" | "lg"

export type CompressionLevel = "full" | "compact" | "collapsed"

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
