// Cortex: Inference Gateway — OpenAI-compatible proxy with smart routing
//
// Runs as a standalone Express server on Contabo.
// OpenClaw agents point their provider baseUrl here.
//
// Endpoints:
//   POST /v1/chat/completions  — main proxy (routed)
//   GET  /health               — liveness
//   GET  /status               — budget states + circuit breaker stats

import express from "express";
import type {
  ChatCompletionRequest,
  InferenceLogEntry,
  Tier,
} from "./types";
import { getCortex, getDefaultCortexId } from "./config";
import { createBudgetTracker } from "./budget";
import { CircuitBreaker } from "./circuit-breaker";
import { routeRequest, BudgetExhaustedError, AllModelsExhaustedError } from "./router";
import { compressContext, enforceInputLimit } from "./context";
import { getAdapter, calculateCost } from "./providers/base";
import { logInference } from "./logger";

// ---------------------------------------------------------------------------
// Singleton state
// ---------------------------------------------------------------------------

const cortex = getCortex(getDefaultCortexId());
const budgetTracker = createBudgetTracker(
  process.env.UPSTASH_REDIS_REST_URL,
);
const circuitBreaker = new CircuitBreaker(cortex.failover.circuitBreaker);

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json({ limit: "4mb" }));

// --- Health check ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok", cortex: cortex.id, uptime: process.uptime() });
});

// --- Status endpoint ---
app.get("/status", async (_req, res) => {
  try {
    const globalSpend = await budgetTracker.getGlobalSpend();
    const providers = ["openai", "anthropic", "google", "deepseek"] as const;
    const cbStates = Object.fromEntries(
      providers.map((p) => [p, circuitBreaker.getState(p)]),
    );

    res.json({
      cortex: cortex.id,
      uptime: process.uptime(),
      globalSpend,
      circuitBreakers: cbStates,
    });
  } catch (err) {
    res.status(500).json({ error: "Status check failed" });
  }
});

// --- Main proxy endpoint ---
app.post("/v1/chat/completions", async (req, res) => {
  const start = Date.now();
  const request = req.body as ChatCompletionRequest;

  // Extract agent ID from API key header or custom header
  // Convention: API key format is "cortex-{agentId}" or custom header
  const authHeader = req.headers.authorization ?? "";
  const customAgentId = req.headers["x-cortex-agent-id"] as string | undefined;
  const agentId =
    customAgentId ||
    extractAgentId(authHeader) ||
    "unknown";

  const cortexId = cortex.id;
  let contextCompressed = false;

  try {
    // 1. Route request
    const decision = await routeRequest(
      request,
      agentId,
      cortex,
      budgetTracker,
      circuitBreaker,
    );

    // 2. Context compression
    const contextConfig = cortex.context[decision.actualTier];
    const { messages: compressedMessages, compressed } = compressContext(
      request.messages,
      contextConfig,
    );
    contextCompressed = compressed;

    // 3. Enforce input limit
    const finalMessages = enforceInputLimit(
      compressedMessages,
      contextConfig.maxInputTokens,
    );

    // 4. Prepare request for provider
    const providerRequest: ChatCompletionRequest = {
      ...request,
      messages: finalMessages,
      model: decision.selectedModel.model,
    };

    // 5. Estimate cost and reserve budget
    const estimatedOutputTokens = request.max_tokens ?? decision.selectedModel.maxOutputTokens / 4;
    const estimatedInputTokens = finalMessages.reduce(
      (sum, m) => sum + Math.ceil((m.content?.length ?? 0) / 4),
      0,
    );
    const estimatedCost = calculateCost(
      estimatedInputTokens,
      estimatedOutputTokens,
      decision.selectedModel,
    );
    await budgetTracker.reserveBudget(agentId, estimatedCost, decision.actualTier);

    // 6. Call provider with retry
    let result;
    let retryCount = 0;
    const maxRetries = cortex.failover.retries;

    while (true) {
      try {
        const adapter = getAdapter(decision.selectedModel.provider);
        result = await adapter.complete(providerRequest, decision.selectedModel.model);
        circuitBreaker.recordSuccess(decision.selectedModel.provider);
        break;
      } catch (err) {
        retryCount++;
        circuitBreaker.recordFailure(decision.selectedModel.provider);

        if (retryCount > maxRetries) {
          throw err;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // 7. Adjust budget with actual cost
    const actualCost = result.costUsd;
    await budgetTracker.adjustBudget(agentId, actualCost, estimatedCost, decision.actualTier);

    // 8. Get updated budget state for logging
    const updatedBudget = await budgetTracker.getBudgetState(agentId, cortex.budget);

    // 9. Log
    const logEntry: InferenceLogEntry = {
      agentId,
      cortexId,
      classifiedTier: decision.originalTier,
      actualTier: decision.actualTier,
      classificationScore: 0, // TODO: pass from decision
      budgetAdjusted: decision.budgetAdjusted,
      provider: result.provider,
      model: result.model,
      wasFailover: decision.failedModels.length > 0,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cachedInputTokens: result.cachedInputTokens,
      costUsd: actualCost,
      dailyBudgetPct: updatedBudget.usedPercent,
      latencyMs: result.latencyMs,
      ttftMs: result.ttftMs,
      contextCompressed,
      errorOccurred: false,
      errorCode: null,
    };
    logInference(logEntry).catch(() => {}); // fire and forget

    // 10. Return response
    res.json(result.response);
  } catch (err) {
    const latencyMs = Date.now() - start;

    if (err instanceof BudgetExhaustedError) {
      const logEntry: InferenceLogEntry = {
        agentId,
        cortexId,
        classifiedTier: "easy",
        actualTier: "easy",
        classificationScore: 0,
        budgetAdjusted: false,
        provider: "none",
        model: "none",
        wasFailover: false,
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        costUsd: 0,
        dailyBudgetPct: err.budgetState.usedPercent,
        latencyMs,
        ttftMs: null,
        contextCompressed,
        errorOccurred: true,
        errorCode: "BUDGET_EXHAUSTED",
      };
      logInference(logEntry).catch(() => {});

      return res.status(429).json({
        error: {
          message: "You've reached today's assistance limit. Your allowance resets at midnight UTC.",
          type: "budget_exhausted",
          code: "budget_exhausted",
        },
      });
    }

    if (err instanceof AllModelsExhaustedError) {
      const logEntry: InferenceLogEntry = {
        agentId,
        cortexId,
        classifiedTier: "easy",
        actualTier: "easy",
        classificationScore: 0,
        budgetAdjusted: false,
        provider: "none",
        model: "none",
        wasFailover: true,
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        costUsd: 0,
        dailyBudgetPct: 0,
        latencyMs,
        ttftMs: null,
        contextCompressed,
        errorOccurred: true,
        errorCode: "ALL_MODELS_EXHAUSTED",
      };
      logInference(logEntry).catch(() => {});

      return res.status(503).json({
        error: {
          message: cortex.failover.failClosedMessage,
          type: "service_unavailable",
          code: "all_models_exhausted",
        },
      });
    }

    // Unexpected error
    console.error("[Cortex/Gateway] Unexpected error:", err);
    return res.status(500).json({
      error: {
        message: "Internal server error",
        type: "server_error",
        code: "internal_error",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractAgentId(authHeader: string): string | null {
  // Format: "Bearer cortex-{agentId}" or "Bearer {agentId}"
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token.startsWith("cortex-")) {
    return token.slice(7);
  }
  return token || null;
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.CORTEX_GATEWAY_PORT ?? "8200", 10);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Cortex] Gateway listening on port ${PORT}`);
    console.log(`[Cortex] Cortex: ${cortex.id}`);
    console.log(`[Cortex] Redis: ${process.env.UPSTASH_REDIS_REST_URL ? "connected" : "in-memory fallback"}`);
    console.log(`[Cortex] Models: easy=${cortex.models.easy.map(m => m.model).join(",")}, medium=${cortex.models.medium.map(m => m.model).join(",")}, hard=${cortex.models.hard.map(m => m.model).join(",")}`);
  });
}

export { app };
