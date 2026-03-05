// Cortex: MeetMatt Inference Engine — Core Types

export type Tier = "easy" | "medium" | "hard";

export type ProviderName =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "local";

export interface ProviderModel {
  provider: ProviderName;
  model: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  maxOutputTokens: number;
  latencyClass: "fast" | "medium" | "slow";
}

export interface BudgetConfig {
  dailyCap: number;
  hardTierMaxPercent: number;
  thresholds: {
    biasTowardCheap: number; // e.g. 0.50
    forceCheap: number; // e.g. 0.80
    failClosed: number; // e.g. 0.95
  };
}

export interface ContextConfig {
  maxInputTokens: number;
  conversationWindow: number;
  compressionTrigger: number;
  compressionTarget: number;
  strategy: "sliding-window" | "summarize" | "hierarchical";
}

export interface ClassifierConfig {
  strategy: "heuristic";
  easyMaxInputTokens: number;
  hardMinInputTokens: number;
  hardKeywords: string[];
}

export interface FailoverConfig {
  retries: number;
  crossProvider: boolean;
  cascadeDown: boolean;
  circuitBreaker: {
    failureThreshold: number;
    windowSeconds: number;
    cooldownSeconds: number;
  };
  failClosedMessage: string;
}

export interface Cortex {
  id: string;
  name: string;
  models: Record<Tier, ProviderModel[]>;
  budget: BudgetConfig;
  context: Record<Tier, ContextConfig>;
  classifier: ClassifierConfig;
  failover: FailoverConfig;
}

// --- Runtime types ---

export interface ClassificationResult {
  tier: Tier;
  score: number;
  signals: {
    tokenScore: number;
    keywordScore: number;
    toolScore: number;
    depthScore: number;
  };
}

export type BudgetConstraint =
  | "none"
  | "bias_cheap"
  | "force_cheap"
  | "fail_closed";

export interface BudgetState {
  agentId: string;
  date: string;
  totalSpend: number;
  hardTierSpend: number;
  dailyCap: number;
  usedPercent: number;
  hardUsedPercent: number;
  constraint: BudgetConstraint;
}

export interface RouteDecision {
  selectedModel: ProviderModel;
  originalTier: Tier;
  actualTier: Tier;
  budgetAdjusted: boolean;
  budgetState: BudgetState;
  failedModels: string[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  [key: string]: unknown;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
      cached_tokens?: number;
    };
  };
}

export interface ProviderResult {
  response: ChatCompletionResponse;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  costUsd: number;
  latencyMs: number;
  ttftMs: number | null;
  provider: ProviderName;
  model: string;
}

export interface InferenceLogEntry {
  agentId: string;
  cortexId: string;
  classifiedTier: Tier;
  actualTier: Tier;
  classificationScore: number;
  budgetAdjusted: boolean;
  provider: string;
  model: string;
  wasFailover: boolean;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  costUsd: number;
  dailyBudgetPct: number;
  latencyMs: number;
  ttftMs: number | null;
  contextCompressed: boolean;
  errorOccurred: boolean;
  errorCode: string | null;
}
