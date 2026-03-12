import type { DeployJob } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { executeAgentDeployment } from "@/lib/deploy-runtime";
import { getErrorMessage, getStatusError } from "@/lib/http-error";

export interface EnqueueDeployJobParams {
  agentId: string;
  providerHint?: string;
  idempotencyKey?: string;
}

export interface EnqueueDeployJobResult {
  jobId: string;
  status: "queued" | "processing";
  created: boolean;
}

export interface ProcessDeployJobsResult {
  scanned: number;
  processed: number;
  completed: number;
  failed: number;
  retried: number;
  remainingQueued: number;
}

function parseBool(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw || "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function shouldUseDeployJobs(): boolean {
  return parseBool(process.env.DEPLOY_JOBS_ENABLED, false);
}

function maxAttempts(): number {
  return parsePositiveInt(process.env.DEPLOY_JOBS_MAX_ATTEMPTS, 5);
}

function baseBackoffSeconds(): number {
  return parsePositiveInt(process.env.DEPLOY_JOBS_BACKOFF_BASE_SECONDS, 15);
}

function computeBackoffMs(attempt: number): number {
  const seconds = Math.min(baseBackoffSeconds() * Math.pow(2, Math.max(0, attempt - 1)), 15 * 60);
  return seconds * 1000;
}

function buildJobIdempotencyKey(params: EnqueueDeployJobParams): string {
  if (params.idempotencyKey && params.idempotencyKey.trim().length > 0) {
    return params.idempotencyKey.trim();
  }
  return `deploy:${params.agentId}:${Date.now()}`;
}

export async function enqueueDeployJob(params: EnqueueDeployJobParams): Promise<EnqueueDeployJobResult> {
  const existing = await prisma.deployJob.findFirst({
    where: {
      agentId: params.agentId,
      type: "deploy",
      status: {
        in: ["queued", "processing"],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return {
      jobId: existing.id,
      status: existing.status as "queued" | "processing",
      created: false,
    };
  }

  const created = await prisma.deployJob.create({
    data: {
      agentId: params.agentId,
      type: "deploy",
      status: "queued",
      attempts: 0,
      maxAttempts: maxAttempts(),
      nextRunAt: new Date(),
      idempotencyKey: buildJobIdempotencyKey(params),
      providerHint: params.providerHint || null,
      payload: {
        enqueuedAt: new Date().toISOString(),
      },
    },
  });

  return {
    jobId: created.id,
    status: "queued",
    created: true,
  };
}

async function claimNextDeployJob(): Promise<DeployJob | null> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();

    const job = await tx.deployJob.findFirst({
      where: {
        type: "deploy",
        status: { in: ["queued", "failed"] },
        nextRunAt: { lte: now },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!job) {
      return null;
    }

    if (job.attempts >= job.maxAttempts) {
      await tx.deployJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          errorCode: job.errorCode || "MAX_ATTEMPTS_EXCEEDED",
          errorMessage: job.errorMessage || "Max attempts exceeded",
        },
      });
      return null;
    }

    const updated = await tx.deployJob.updateMany({
      where: {
        id: job.id,
        status: { in: ["queued", "failed"] },
      },
      data: {
        status: "processing",
        attempts: { increment: 1 },
        lastAttemptAt: now,
      },
    });

    if (updated.count === 0) {
      return null;
    }

    return {
      ...job,
      status: "processing",
      attempts: job.attempts + 1,
      lastAttemptAt: now,
    };
  });
}

function isRetryable(statusCode: number | null): boolean {
  if (statusCode === null) {
    return true;
  }
  return statusCode >= 500 || statusCode === 408 || statusCode === 409 || statusCode === 429;
}

async function markAgentFailed(agentId: string, code: string, message: string): Promise<void> {
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      status: "error",
      activationStatus: "failed",
      deployState: "failed",
      deployErrorCode: code,
      deployErrorMessage: message,
    },
  }).catch(() => undefined);
}

export async function processDeployJobs(limit = 10): Promise<ProcessDeployJobsResult> {
  const safeLimit = Math.min(Math.max(1, limit), 50);
  let scanned = 0;
  let processed = 0;
  let completed = 0;
  let failed = 0;
  let retried = 0;

  while (scanned < safeLimit) {
    scanned += 1;
    const job = await claimNextDeployJob();
    if (!job) {
      break;
    }

    processed += 1;
    try {
      await executeAgentDeployment(job.agentId);
      await prisma.deployJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          errorCode: null,
          errorMessage: null,
          nextRunAt: new Date(),
        },
      });
      completed += 1;
    } catch (error: unknown) {
      const statusError = getStatusError(error);
      const statusCode = statusError?.status ?? null;
      const code = statusCode ? `HTTP_${statusCode}` : "DEPLOY_ERROR";
      const message = statusError?.message || getErrorMessage(error, "Deployment failed");
      const retryable = isRetryable(statusCode);
      const exhausted = job.attempts >= job.maxAttempts;
      const shouldRetry = retryable && !exhausted;

      await prisma.deployJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorCode: code,
          errorMessage: message,
          nextRunAt: shouldRetry
            ? new Date(Date.now() + computeBackoffMs(job.attempts))
            : new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await markAgentFailed(job.agentId, code, message);

      if (shouldRetry) {
        retried += 1;
      } else {
        failed += 1;
      }
    }
  }

  const remainingQueued = await prisma.deployJob.count({
    where: {
      type: "deploy",
      status: { in: ["queued", "failed"] },
      nextRunAt: { lte: new Date() },
    },
  });

  return {
    scanned,
    processed,
    completed,
    failed,
    retried,
    remainingQueued,
  };
}
