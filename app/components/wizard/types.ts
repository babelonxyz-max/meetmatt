export type Step = "name" | "role" | "features" | "login" | "token" | "deploy"

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
