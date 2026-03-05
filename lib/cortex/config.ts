import type { Cortex } from "./types";

export const MATT_CONSUMER: Cortex = {
  id: "matt-consumer",
  name: "Matt Consumer",

  models: {
    easy: [
      {
        provider: "openai",
        model: "gpt-4.1-nano",
        inputPricePerMillion: 0.1,
        outputPricePerMillion: 0.4,
        maxOutputTokens: 4096,
        latencyClass: "fast",
      },
      {
        provider: "google",
        model: "gemini-2.0-flash",
        inputPricePerMillion: 0.1,
        outputPricePerMillion: 0.4,
        maxOutputTokens: 8192,
        latencyClass: "fast",
      },
    ],
    medium: [
      {
        provider: "openai",
        model: "gpt-4.1-mini",
        inputPricePerMillion: 0.4,
        outputPricePerMillion: 1.6,
        maxOutputTokens: 16384,
        latencyClass: "fast",
      },
      {
        provider: "deepseek",
        model: "deepseek-chat",
        inputPricePerMillion: 0.28,
        outputPricePerMillion: 0.42,
        maxOutputTokens: 8192,
        latencyClass: "medium",
      },
    ],
    hard: [
      {
        provider: "openai",
        model: "gpt-4.1",
        inputPricePerMillion: 2.0,
        outputPricePerMillion: 8.0,
        maxOutputTokens: 32768,
        latencyClass: "medium",
      },
      {
        provider: "anthropic",
        model: "claude-sonnet-4-6-20250514",
        inputPricePerMillion: 3.0,
        outputPricePerMillion: 15.0,
        maxOutputTokens: 16384,
        latencyClass: "slow",
      },
    ],
  },

  budget: {
    dailyCap: 1.5,
    hardTierMaxPercent: 0.2,
    thresholds: {
      biasTowardCheap: 0.5,
      forceCheap: 0.8,
      failClosed: 0.95,
    },
  },

  context: {
    easy: {
      maxInputTokens: 4096,
      conversationWindow: 8192,
      compressionTrigger: 6144,
      compressionTarget: 2048,
      strategy: "sliding-window",
    },
    medium: {
      maxInputTokens: 16384,
      conversationWindow: 32768,
      compressionTrigger: 24576,
      compressionTarget: 8192,
      strategy: "summarize",
    },
    hard: {
      maxInputTokens: 32768,
      conversationWindow: 65536,
      compressionTrigger: 49152,
      compressionTarget: 16384,
      strategy: "hierarchical",
    },
  },

  classifier: {
    strategy: "heuristic",
    easyMaxInputTokens: 200,
    hardMinInputTokens: 2000,
    hardKeywords: [
      "analyze",
      "compare",
      "write code",
      "create",
      "debug",
      "refactor",
      "explain in detail",
      "summarize this document",
      "review",
      "design",
      "implement",
      "optimize",
      "evaluate",
      "research",
      "draft a report",
      "generate a plan",
    ],
  },

  failover: {
    retries: 2,
    crossProvider: true,
    cascadeDown: true,
    circuitBreaker: {
      failureThreshold: 0.4,
      windowSeconds: 60,
      cooldownSeconds: 120,
    },
    failClosedMessage:
      "I'm temporarily unable to respond. Please try again in a moment.",
  },
};

const CORTEX_REGISTRY: Record<string, Cortex> = {
  "matt-consumer": MATT_CONSUMER,
};

export function getCortex(id: string): Cortex {
  const cortex = CORTEX_REGISTRY[id];
  if (!cortex) {
    throw new Error(`Unknown cortex: ${id}`);
  }
  return cortex;
}

export function getDefaultCortexId(): string {
  return "matt-consumer";
}
