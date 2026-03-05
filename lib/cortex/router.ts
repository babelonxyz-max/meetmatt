// Cortex: Core Router — classify, budget-check, select model, failover

import type {
  ChatCompletionRequest,
  Cortex,
  RouteDecision,
  Tier,
  ProviderModel,
  BudgetState,
} from "./types";
import { classifyRequest } from "./classifier";
import type { BudgetTracker } from "./budget";
import type { CircuitBreaker } from "./circuit-breaker";

const TIER_ORDER: Tier[] = ["hard", "medium", "easy"];

function lowerTier(tier: Tier): Tier | null {
  const idx = TIER_ORDER.indexOf(tier);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

/**
 * Route a request through the Cortex pipeline:
 * 1. Classify → tier
 * 2. Budget check → adjust tier if needed
 * 3. Select model from tier ladder (skip circuit-broken providers)
 * 4. Cascade down if tier exhausted
 * 5. Fail-closed if all options exhausted
 */
export async function routeRequest(
  request: ChatCompletionRequest,
  agentId: string,
  cortex: Cortex,
  budgetTracker: BudgetTracker,
  circuitBreaker: CircuitBreaker,
): Promise<RouteDecision> {
  // 1. Classify
  const classification = classifyRequest(request, cortex.classifier);
  const originalTier = classification.tier;

  // 2. Budget check
  const budgetState = await budgetTracker.getBudgetState(
    agentId,
    cortex.budget,
  );
  const actualTier = applyBudgetConstraints(
    originalTier,
    budgetState,
    cortex,
  );

  // Fail-closed check
  if (budgetState.constraint === "fail_closed") {
    throw new BudgetExhaustedError(agentId, budgetState);
  }

  // 3. Select model with failover
  const failedModels: string[] = [];
  const selected = selectModel(
    actualTier,
    cortex,
    circuitBreaker,
    failedModels,
  );

  if (!selected) {
    throw new AllModelsExhaustedError(agentId, failedModels);
  }

  return {
    selectedModel: selected.model,
    originalTier,
    actualTier: selected.tier,
    budgetAdjusted: originalTier !== selected.tier,
    budgetState,
    failedModels,
  };
}

function applyBudgetConstraints(
  tier: Tier,
  budgetState: BudgetState,
  cortex: Cortex,
): Tier {
  const { constraint } = budgetState;

  // Hard-tier cap check
  if (tier === "hard" && budgetState.hardUsedPercent >= 1.0) {
    return "medium";
  }

  switch (constraint) {
    case "none":
      return tier;
    case "bias_cheap":
      return tier === "hard" ? "medium" : tier;
    case "force_cheap":
      return "easy";
    case "fail_closed":
      return tier; // handled separately above
  }
}

function selectModel(
  startTier: Tier,
  cortex: Cortex,
  circuitBreaker: CircuitBreaker,
  failedModels: string[],
): { model: ProviderModel; tier: Tier } | null {
  let tier: Tier | null = startTier;

  while (tier !== null) {
    const models = cortex.models[tier];
    for (const model of models) {
      const providerKey = `${model.provider}:${model.model}`;
      if (circuitBreaker.isOpen(model.provider)) {
        failedModels.push(`${providerKey}(circuit-open)`);
        continue;
      }
      return { model, tier };
    }

    // All models in this tier circuit-broken → cascade down
    if (cortex.failover.cascadeDown) {
      tier = lowerTier(tier);
    } else {
      break;
    }
  }

  return null;
}

// --- Error types ---

export class BudgetExhaustedError extends Error {
  readonly agentId: string;
  readonly budgetState: BudgetState;

  constructor(agentId: string, budgetState: BudgetState) {
    super(`Daily budget exhausted for agent ${agentId}`);
    this.name = "BudgetExhaustedError";
    this.agentId = agentId;
    this.budgetState = budgetState;
  }
}

export class AllModelsExhaustedError extends Error {
  readonly agentId: string;
  readonly failedModels: string[];

  constructor(agentId: string, failedModels: string[]) {
    super(
      `All models exhausted for agent ${agentId}: ${failedModels.join(", ")}`,
    );
    this.name = "AllModelsExhaustedError";
    this.agentId = agentId;
    this.failedModels = failedModels;
  }
}
