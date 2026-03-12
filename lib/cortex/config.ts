import type { Cortex, ProviderModel } from "./types";

const EASY_MODELS: ProviderModel[] = [
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
];

const MEDIUM_MODELS: ProviderModel[] = [
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
];

const HARD_MODELS: ProviderModel[] = [
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
];

function cloneModels(models: ProviderModel[]): ProviderModel[] {
  return models.map((model) => ({ ...model }));
}

function createCortex(base: {
  id: string;
  name: string;
  budget: Cortex["budget"];
  context: Cortex["context"];
  classifier: Cortex["classifier"];
  failoverMessage: string;
  models?: Partial<Record<keyof Cortex["models"], ProviderModel[]>>;
}): Cortex {
  return {
    id: base.id,
    name: base.name,
    models: {
      easy: cloneModels(base.models?.easy || EASY_MODELS),
      medium: cloneModels(base.models?.medium || MEDIUM_MODELS),
      hard: cloneModels(base.models?.hard || HARD_MODELS),
    },
    budget: base.budget,
    context: base.context,
    classifier: base.classifier,
    failover: {
      retries: 2,
      crossProvider: true,
      cascadeDown: true,
      circuitBreaker: {
        failureThreshold: 0.4,
        windowSeconds: 60,
        cooldownSeconds: 120,
      },
      failClosedMessage: base.failoverMessage,
    },
  };
}

export const MATT_CONSUMER: Cortex = createCortex({
  id: "matt-consumer",
  name: "Matt Consumer",
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
      "review",
      "design",
      "implement",
      "optimize",
      "evaluate",
      "research",
      "generate a plan",
    ],
  },
  failoverMessage:
    "I'm temporarily unable to respond. Please try again in a moment.",
});

export const MATT_ACCOUNT_MANAGER: Cortex = createCortex({
  id: "matt-account-manager",
  name: "Matt Account Manager",
  budget: {
    dailyCap: 2.5,
    hardTierMaxPercent: 0.3,
    thresholds: {
      biasTowardCheap: 0.55,
      forceCheap: 0.85,
      failClosed: 0.98,
    },
  },
  context: {
    easy: {
      maxInputTokens: 6144,
      conversationWindow: 12288,
      compressionTrigger: 8192,
      compressionTarget: 3072,
      strategy: "sliding-window",
    },
    medium: {
      maxInputTokens: 24576,
      conversationWindow: 49152,
      compressionTrigger: 32768,
      compressionTarget: 12288,
      strategy: "summarize",
    },
    hard: {
      maxInputTokens: 49152,
      conversationWindow: 98304,
      compressionTrigger: 65536,
      compressionTarget: 20480,
      strategy: "hierarchical",
    },
  },
  classifier: {
    strategy: "heuristic",
    easyMaxInputTokens: 240,
    hardMinInputTokens: 2400,
    hardKeywords: [
      "renewal",
      "roadmap",
      "escalation",
      "account plan",
      "business review",
      "proposal",
      "onboarding",
      "expansion",
      "risk",
      "strategy",
    ],
  },
  failoverMessage:
    "Matt is temporarily unavailable. Your account manager will pick this back up shortly.",
});

export const MATT_SUPPORT: Cortex = createCortex({
  id: "matt-support",
  name: "Matt Support",
  budget: {
    dailyCap: 3.5,
    hardTierMaxPercent: 0.35,
    thresholds: {
      biasTowardCheap: 0.5,
      forceCheap: 0.8,
      failClosed: 0.97,
    },
  },
  context: {
    easy: {
      maxInputTokens: 6144,
      conversationWindow: 12288,
      compressionTrigger: 8192,
      compressionTarget: 3072,
      strategy: "sliding-window",
    },
    medium: {
      maxInputTokens: 24576,
      conversationWindow: 49152,
      compressionTrigger: 32768,
      compressionTarget: 12288,
      strategy: "summarize",
    },
    hard: {
      maxInputTokens: 49152,
      conversationWindow: 98304,
      compressionTrigger: 65536,
      compressionTarget: 24576,
      strategy: "hierarchical",
    },
  },
  classifier: {
    strategy: "heuristic",
    easyMaxInputTokens: 220,
    hardMinInputTokens: 1800,
    hardKeywords: [
      "incident",
      "failure",
      "billing issue",
      "refund",
      "outage",
      "broken",
      "deploy failed",
      "support ticket",
      "escalate",
      "root cause",
    ],
  },
  failoverMessage:
    "Support is temporarily saturated. We've kept your ticket open and Matt will follow up shortly.",
});

export const INTERNAL_OPS: Cortex = createCortex({
  id: "internal-ops",
  name: "Internal Ops",
  budget: {
    dailyCap: 8,
    hardTierMaxPercent: 0.55,
    thresholds: {
      biasTowardCheap: 0.6,
      forceCheap: 0.85,
      failClosed: 0.99,
    },
  },
  context: {
    easy: {
      maxInputTokens: 8192,
      conversationWindow: 16384,
      compressionTrigger: 12288,
      compressionTarget: 4096,
      strategy: "sliding-window",
    },
    medium: {
      maxInputTokens: 32768,
      conversationWindow: 65536,
      compressionTrigger: 49152,
      compressionTarget: 16384,
      strategy: "summarize",
    },
    hard: {
      maxInputTokens: 65536,
      conversationWindow: 131072,
      compressionTrigger: 98304,
      compressionTarget: 32768,
      strategy: "hierarchical",
    },
  },
  classifier: {
    strategy: "heuristic",
    easyMaxInputTokens: 180,
    hardMinInputTokens: 1600,
    hardKeywords: [
      "migration",
      "query",
      "deploy",
      "infrastructure",
      "incident review",
      "rollback",
      "diagnose",
      "postgres",
      "redis",
      "telethon",
    ],
  },
  failoverMessage:
    "Internal ops routing is temporarily unavailable. Retry the task from the control plane.",
});

export const FLEET_SWARM: Cortex = createCortex({
  id: "fleet-swarm",
  name: "Fleet Swarm",
  budget: {
    dailyCap: 0.5,
    hardTierMaxPercent: 0.1,
    thresholds: {
      biasTowardCheap: 0.45,
      forceCheap: 0.7,
      failClosed: 0.92,
    },
  },
  context: {
    easy: {
      maxInputTokens: 3072,
      conversationWindow: 6144,
      compressionTrigger: 4096,
      compressionTarget: 1536,
      strategy: "sliding-window",
    },
    medium: {
      maxInputTokens: 8192,
      conversationWindow: 16384,
      compressionTrigger: 12288,
      compressionTarget: 4096,
      strategy: "summarize",
    },
    hard: {
      maxInputTokens: 16384,
      conversationWindow: 32768,
      compressionTrigger: 24576,
      compressionTarget: 8192,
      strategy: "hierarchical",
    },
  },
  classifier: {
    strategy: "heuristic",
    easyMaxInputTokens: 160,
    hardMinInputTokens: 1200,
    hardKeywords: [
      "batch",
      "queue",
      "support triage",
      "classification",
      "extract",
      "label",
      "handoff",
    ],
  },
  models: {
    medium: [
      {
        provider: "deepseek",
        model: "deepseek-chat",
        inputPricePerMillion: 0.28,
        outputPricePerMillion: 0.42,
        maxOutputTokens: 8192,
        latencyClass: "medium",
      },
      {
        provider: "openai",
        model: "gpt-4.1-mini",
        inputPricePerMillion: 0.4,
        outputPricePerMillion: 1.6,
        maxOutputTokens: 16384,
        latencyClass: "fast",
      },
    ],
    hard: [
      {
        provider: "openai",
        model: "gpt-4.1-mini",
        inputPricePerMillion: 0.4,
        outputPricePerMillion: 1.6,
        maxOutputTokens: 16384,
        latencyClass: "fast",
      },
      {
        provider: "openai",
        model: "gpt-4.1",
        inputPricePerMillion: 2.0,
        outputPricePerMillion: 8.0,
        maxOutputTokens: 32768,
        latencyClass: "medium",
      },
    ],
  },
  failoverMessage:
    "The internal fleet is temporarily saturated. Requeue the task or escalate to ops.",
});

const CORTEX_REGISTRY: Record<string, Cortex> = {
  "matt-consumer": MATT_CONSUMER,
  "matt-account-manager": MATT_ACCOUNT_MANAGER,
  "matt-support": MATT_SUPPORT,
  "internal-ops": INTERNAL_OPS,
  "fleet-swarm": FLEET_SWARM,
};

export function getCortex(id: string): Cortex {
  const cortex = CORTEX_REGISTRY[id];
  if (!cortex) {
    throw new Error(`Unknown cortex: ${id}`);
  }
  return cortex;
}

export function listCortexIds(): string[] {
  return Object.keys(CORTEX_REGISTRY);
}

export function getDefaultCortexId(): string {
  return "matt-consumer";
}
