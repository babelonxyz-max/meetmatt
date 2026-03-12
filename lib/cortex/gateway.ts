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
import { fileURLToPath } from "node:url";
import type {
  ChatCompletionRequest,
  InferenceLogEntry,
} from "./types";
import { getCortex, getDefaultCortexId } from "./config";
import { createBudgetTracker } from "./budget";
import { CircuitBreaker } from "./circuit-breaker";
import { routeRequest, BudgetExhaustedError, AllModelsExhaustedError } from "./router";
import { compressContext, enforceInputLimit } from "./context";
import { getAdapter, calculateCost } from "./providers/base";
import { logInference } from "./logger";

type CapabilityUsageModule = Pick<
  typeof import("../capability-commerce/usage"),
  "reserveSkillUsageForAgent" | "finalizeReservedSkillUsage"
>;

type CapabilityUsageContext = {
  skillSlug: string;
  units: number;
  runId: string | null;
  userId: string | null;
};

type CapabilityUsageReservation = Awaited<
  ReturnType<CapabilityUsageModule["reserveSkillUsageForAgent"]>
>;

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

let capabilityUsageModule: CapabilityUsageModule | null = null;

async function getCapabilityUsageModule(): Promise<CapabilityUsageModule> {
  if (capabilityUsageModule) {
    return capabilityUsageModule;
  }

  const usageModule = await import("../capability-commerce/usage");
  capabilityUsageModule = {
    reserveSkillUsageForAgent: usageModule.reserveSkillUsageForAgent,
    finalizeReservedSkillUsage: usageModule.finalizeReservedSkillUsage,
  };
  return capabilityUsageModule;
}

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
  } catch {
    res.status(500).json({ error: "Status check failed" });
  }
});

// --- Main proxy endpoint ---
app.post("/v1/chat/completions", async (req, res) => {
  const start = Date.now();
  const rawRequest = req.body as ChatCompletionRequest & Record<string, unknown>;
  const request = stripCapabilityUsageFields(rawRequest);

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
  const capabilityUsage = extractCapabilityUsage(req.headers, rawRequest);
  let capabilityReservation: CapabilityUsageReservation | null = null;

  try {
    if (capabilityUsage && agentId === "unknown") {
      return res.status(400).json({
        error: {
          message: "Capability metering requires a valid agent id",
          type: "invalid_request_error",
          code: "missing_agent_id",
        },
      });
    }

    if (capabilityUsage) {
      const usageModule = await getCapabilityUsageModule();
      capabilityReservation = await usageModule.reserveSkillUsageForAgent({
        agentId,
        skillSlug: capabilityUsage.skillSlug,
        units: capabilityUsage.units,
      });
    }

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

    if (capabilityReservation && capabilityUsage) {
      const usageModule = await getCapabilityUsageModule();
      await usageModule.finalizeReservedSkillUsage({
        reservation: capabilityReservation,
        agentId,
        userId: capabilityUsage.userId,
        runId: capabilityUsage.runId,
        units: capabilityUsage.units,
        unitType: "request",
        costBasis: {
          estimatedCostUsd: estimatedCost,
          actualCostUsd: actualCost,
          provider: result.provider,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cachedInputTokens: result.cachedInputTokens,
          latencyMs: result.latencyMs,
          ttftMs: result.ttftMs,
          cortexId,
          classifiedTier: decision.originalTier,
          actualTier: decision.actualTier,
        },
        result: "succeeded",
        refundOnFailure: false,
      }).catch((finalizeError: unknown) => {
        console.error("[Cortex/Gateway] Failed to finalize capability usage:", finalizeError);
      });
    }

    // 10. Return response
    res.json(result.response);
  } catch (err) {
    const latencyMs = Date.now() - start;
    const capabilityErrorCode = getCapabilityErrorCode(err);

    if (capabilityReservation && capabilityUsage) {
      const usageModule = await getCapabilityUsageModule();
      await usageModule.finalizeReservedSkillUsage({
        reservation: capabilityReservation,
        agentId,
        userId: capabilityUsage.userId,
        runId: capabilityUsage.runId,
        units: capabilityUsage.units,
        unitType: "request",
        costBasis: {
          errorCode: capabilityErrorCode,
          latencyMs,
          cortexId,
        },
        result: "failed",
        refundOnFailure: true,
      }).catch((finalizeError: unknown) => {
        console.error("[Cortex/Gateway] Failed to finalize capability usage:", finalizeError);
      });
    }

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

function readHeaderValue(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return readHeaderValue(value[0]);
  }
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readBodyString(
  body: Record<string, unknown>,
  key: string,
): string | null {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeUnits(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
}

function extractCapabilityUsage(
  headers: express.Request["headers"],
  body: Record<string, unknown>,
): CapabilityUsageContext | null {
  const skillSlug =
    readHeaderValue(headers["x-matt-skill-slug"]) ||
    readBodyString(body, "matt_skill_slug");

  if (!skillSlug) {
    return null;
  }

  return {
    skillSlug,
    units:
      normalizeUnits(readHeaderValue(headers["x-matt-skill-units"]) ?? body["matt_skill_units"]),
    runId:
      readHeaderValue(headers["x-matt-run-id"]) ||
      readBodyString(body, "matt_run_id"),
    userId:
      readHeaderValue(headers["x-matt-user-id"]) ||
      readBodyString(body, "matt_user_id"),
  };
}

function getCapabilityErrorCode(error: unknown): string {
  if (error instanceof BudgetExhaustedError) {
    return "BUDGET_EXHAUSTED";
  }
  if (error instanceof AllModelsExhaustedError) {
    return "ALL_MODELS_EXHAUSTED";
  }
  return "INTERNAL_ERROR";
}

function stripCapabilityUsageFields(
  request: ChatCompletionRequest & Record<string, unknown>,
): ChatCompletionRequest {
  const sanitized = { ...request };
  delete sanitized.matt_skill_slug;
  delete sanitized.matt_skill_units;
  delete sanitized.matt_run_id;
  delete sanitized.matt_user_id;
  return sanitized;
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.CORTEX_GATEWAY_PORT ?? "8200", 10);

export function startCortexGateway(port = PORT) {
  return app.listen(port, () => {
    console.log(`[Cortex] Gateway listening on port ${port}`);
    console.log(`[Cortex] Cortex: ${cortex.id}`);
    console.log(`[Cortex] Redis: ${process.env.UPSTASH_REDIS_REST_URL ? "connected" : "in-memory fallback"}`);
    console.log(`[Cortex] Models: easy=${cortex.models.easy.map((m) => m.model).join(",")}, medium=${cortex.models.medium.map((m) => m.model).join(",")}, hard=${cortex.models.hard.map((m) => m.model).join(",")}`);
  });
}

function isDirectExecution(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint) && fileURLToPath(import.meta.url) === entrypoint;
}

if (isDirectExecution()) {
  startCortexGateway();
}

export { app };
