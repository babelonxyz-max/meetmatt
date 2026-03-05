import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/crypto-utils";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_AUTH_TOKEN;
  if (!secret) return false;
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return safeCompare(token, secret);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "7", 10), 30);
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const [totals, perAgent, perTier, perProvider, hourly] = await Promise.all([
      // Overall totals
      prisma.inferenceLog.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { costUsd: true, inputTokens: true, outputTokens: true },
        _count: true,
        _avg: { latencyMs: true, costUsd: true },
      }),

      // Per-agent spend (top 20)
      prisma.inferenceLog.groupBy({
        by: ["agentId"],
        where: { createdAt: { gte: since } },
        _sum: { costUsd: true },
        _count: true,
        orderBy: { _sum: { costUsd: "desc" } },
        take: 20,
      }),

      // Tier distribution
      prisma.inferenceLog.groupBy({
        by: ["actualTier"],
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { costUsd: true },
        _avg: { latencyMs: true },
      }),

      // Provider distribution
      prisma.inferenceLog.groupBy({
        by: ["provider"],
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { costUsd: true },
      }),

      // Failover + error counts
      prisma.inferenceLog.aggregate({
        where: { createdAt: { gte: since }, wasFailover: true },
        _count: true,
      }),
    ]);

    const errorCount = await prisma.inferenceLog.count({
      where: { createdAt: { gte: since }, errorOccurred: true },
    });

    const budgetExhaustionCount = await prisma.inferenceLog.count({
      where: { createdAt: { gte: since }, dailyBudgetPct: { gte: 0.95 } },
    });

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      totals: {
        requests: totals._count,
        totalCostUsd: totals._sum.costUsd ?? 0,
        totalInputTokens: totals._sum.inputTokens ?? 0,
        totalOutputTokens: totals._sum.outputTokens ?? 0,
        avgCostPerRequest: totals._avg.costUsd ?? 0,
        avgLatencyMs: totals._avg.latencyMs ?? 0,
      },
      perAgent,
      tierDistribution: perTier,
      providerDistribution: perProvider,
      reliability: {
        failoverRequests: hourly._count,
        failoverRate: totals._count > 0 ? hourly._count / totals._count : 0,
        errorCount,
        errorRate: totals._count > 0 ? errorCount / totals._count : 0,
        budgetExhaustionEvents: budgetExhaustionCount,
      },
    });
  } catch (error) {
    console.error("[Cortex/Dashboard] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
