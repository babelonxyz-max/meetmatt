// Cortex: Request Logger — writes InferenceLog records

import type { InferenceLogEntry } from "./types";

type PrismaClientLike = {
  inferenceLog: {
    create: (args: {
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
};

// Prisma client is loaded lazily to allow the gateway to run standalone
let prismaClient: PrismaClientLike | null = null;

async function getPrisma(): Promise<PrismaClientLike> {
  // Dynamic import to avoid build-time issues when running gateway standalone
  const { prisma } = await import("../prisma");
  return prisma as unknown as PrismaClientLike;
}

/**
 * Log an inference request to both stdout (structured JSON) and PostgreSQL.
 * Logging is best-effort — failures are caught and logged to stderr.
 */
export async function logInference(entry: InferenceLogEntry): Promise<void> {
  // Always emit structured JSON to stdout for real-time monitoring
  const logLine = {
    type: "inference_log",
    timestamp: new Date().toISOString(),
    ...entry,
  };
  console.log(JSON.stringify(logLine));

  // Write to database (best-effort)
  try {
    if (!prismaClient) {
      prismaClient = await getPrisma();
    }
    await prismaClient.inferenceLog.create({
      data: {
        agentId: entry.agentId,
        cortexId: entry.cortexId,
        classifiedTier: entry.classifiedTier,
        actualTier: entry.actualTier,
        classificationScore: entry.classificationScore,
        budgetAdjusted: entry.budgetAdjusted,
        provider: entry.provider,
        model: entry.model,
        wasFailover: entry.wasFailover,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        cachedInputTokens: entry.cachedInputTokens,
        costUsd: entry.costUsd,
        dailyBudgetPct: entry.dailyBudgetPct,
        latencyMs: entry.latencyMs,
        ttftMs: entry.ttftMs,
        contextCompressed: entry.contextCompressed,
        errorOccurred: entry.errorOccurred,
        errorCode: entry.errorCode,
      },
    });
  } catch (err) {
    console.error("[Cortex/Logger] Failed to write to DB:", err);
  }
}
