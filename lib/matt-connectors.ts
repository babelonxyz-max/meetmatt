import { UsageResult } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  executeWorkspaceComposioTool,
  isComposioConfigured,
  recordWorkspaceComposioFallbackEvent,
  updateWorkspaceComposioState,
} from "@/lib/composio";
import {
  executeWorkspaceSeshAction,
  getWorkspaceSeshState,
  isSeshAdminConfigured,
  updateWorkspaceSeshState,
} from "@/lib/sesh";
import {
  finalizeReservedSkillUsage,
  reserveSkillUsageForAgent,
} from "@/lib/capability-commerce/usage";
import { ensurePersonalWorkspaceForUser } from "@/lib/workspaces";

export const MATT_CONNECTOR_SKILL_SLUG = "workspace_tool_action";

async function resolveAgentWorkspaceId(agentId: string): Promise<string> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
    },
  });

  if (!agent) {
    throw { status: 404, message: "Agent not found" };
  }

  if (agent.workspaceId) {
    return agent.workspaceId;
  }

  if (!agent.userId) {
    throw { status: 400, message: "Agent is not attached to a workspace or user" };
  }

  return (await ensurePersonalWorkspaceForUser(agent.userId)).workspaceId;
}

export async function executeMattConnectorAction(params: {
  agentId: string;
  composioToolSlug?: string | null;
  composioInput?: Record<string, unknown> | null;
  composioToolkits?: string[];
  fallbackProvider?: string | null;
  fallbackAction?: string | null;
  fallbackArgs?: unknown[];
  allowSeshFallback?: boolean;
  runId?: string | null;
  userId?: string | null;
}) {
  const workspaceId = await resolveAgentWorkspaceId(params.agentId);
  const reservation = await reserveSkillUsageForAgent({
    agentId: params.agentId,
    skillSlug: MATT_CONNECTOR_SKILL_SLUG,
  });

  try {
    const actionResult = await runWorkspaceConnectorAction({
      workspaceId,
      composioToolSlug: params.composioToolSlug,
      composioInput: params.composioInput,
      composioToolkits: params.composioToolkits,
      fallbackProvider: params.fallbackProvider,
      fallbackAction: params.fallbackAction,
      fallbackArgs: params.fallbackArgs,
      allowSeshFallback: params.allowSeshFallback,
    });

    await finalizeReservedSkillUsage({
      reservation,
      agentId: params.agentId,
      userId: params.userId ?? null,
      runId: params.runId ?? null,
      result: UsageResult.succeeded,
      refundOnFailure: true,
      costBasis: {
        provider: actionResult.provider,
        workspaceId,
        toolSlug: params.composioToolSlug?.trim() || null,
        fallbackUsed: actionResult.fallbackUsed,
        fallbackProvider: params.fallbackProvider?.trim() || null,
        fallbackAction: params.fallbackAction?.trim() || null,
        fallbackReason: actionResult.composioError ?? null,
      },
    });

    return actionResult;
  } catch (error: unknown) {
    const composioError = error instanceof Error ? error : new Error("Composio execution failed");
    await finalizeReservedSkillUsage({
      reservation,
      agentId: params.agentId,
      userId: params.userId ?? null,
      runId: params.runId ?? null,
      result: UsageResult.failed,
      refundOnFailure: true,
      costBasis: {
        provider: "composio",
        workspaceId,
        toolSlug: params.composioToolSlug ?? null,
        fallbackProvider: params.fallbackProvider?.trim() || null,
        fallbackAction: params.fallbackAction?.trim() || null,
        error: composioError.message,
      },
    });

    throw composioError;
  }
}

async function runWorkspaceConnectorAction(params: {
  workspaceId: string;
  composioToolSlug?: string | null;
  composioInput?: Record<string, unknown> | null;
  composioToolkits?: string[];
  fallbackProvider?: string | null;
  fallbackAction?: string | null;
  fallbackArgs?: unknown[];
  allowSeshFallback?: boolean;
}) {
  let composioError: Error | null = null;
  const startedAt = Date.now();

  try {
    if (params.composioToolSlug?.trim() && isComposioConfigured()) {
      const result = await executeWorkspaceComposioTool({
        workspaceId: params.workspaceId,
        toolSlug: params.composioToolSlug.trim(),
        input: params.composioInput ?? {},
        toolkits: params.composioToolkits,
      });
      const now = new Date().toISOString();
      await updateWorkspaceComposioState(params.workspaceId, {
        enabled: true,
        mode: "primary",
        readiness: "ready",
        executionOk: true,
        lastActionAt: now,
        lastProviderUsed: "composio",
        lastError: null,
        lastValidationError: null,
      });

      return {
        provider: "composio",
        fallbackUsed: false,
        latencyMs: Date.now() - startedAt,
        result,
      };
    }
  } catch (error: unknown) {
    composioError = error instanceof Error ? error : new Error("Composio execution failed");
    await updateWorkspaceComposioState(params.workspaceId, {
      enabled: true,
      mode: "primary",
      readiness: "degraded",
      lastProviderUsed: "composio",
      lastError: composioError.message,
    });
  }

  const canFallback =
    params.allowSeshFallback !== false &&
    params.fallbackProvider?.trim() &&
    params.fallbackAction?.trim() &&
    isSeshAdminConfigured();

  if (canFallback) {
    const provider = params.fallbackProvider!.trim();
    const action = params.fallbackAction!.trim();
    const result = await executeWorkspaceSeshAction<Record<string, unknown>>({
      workspaceId: params.workspaceId,
      provider,
      action,
      args: params.fallbackArgs ?? [],
    });

    const currentSeshState = await getWorkspaceSeshState(params.workspaceId);
    const now = new Date().toISOString();
    await updateWorkspaceSeshState(params.workspaceId, {
      composioFallback: {
        provider,
        enabled: true,
        lastActionAt: now,
        lastFallbackAt: now,
        fallbackCount: (currentSeshState.composioFallback?.fallbackCount ?? 0) + 1,
        lastError: composioError?.message ?? null,
      },
    });
    await recordWorkspaceComposioFallbackEvent({
      workspaceId: params.workspaceId,
      provider: "sesh",
      reason: composioError?.message ?? `Fallback to ${provider}/${action}`,
    });

    return {
      provider: "sesh",
      fallbackUsed: true,
      latencyMs: Date.now() - startedAt,
      composioError: composioError?.message ?? null,
      result,
    };
  }

  if (composioError) {
    throw composioError;
  }

  throw new Error("No Composio tool or SESH fallback action was available");
}

export async function smokeTestMattConnectorAction(params: {
  workspaceId: string;
  composioToolSlug?: string | null;
  composioInput?: Record<string, unknown> | null;
  composioToolkits?: string[];
  fallbackProvider?: string | null;
  fallbackAction?: string | null;
  fallbackArgs?: unknown[];
  allowSeshFallback?: boolean;
}) {
  const startedAt = Date.now();

  try {
    const result = await runWorkspaceConnectorAction({
      workspaceId: params.workspaceId,
      composioToolSlug: params.composioToolSlug,
      composioInput: params.composioInput,
      composioToolkits: params.composioToolkits,
      fallbackProvider: params.fallbackProvider,
      fallbackAction: params.fallbackAction,
      fallbackArgs: params.fallbackArgs,
      allowSeshFallback: params.allowSeshFallback,
    });

    return {
      ok: true,
      status: "succeeded" as const,
      providerUsed: result.provider,
      fallbackUsed: result.fallbackUsed,
      toolSlug: params.composioToolSlug?.trim() || null,
      latencyMs: Date.now() - startedAt,
      errorMessage: null,
      result: result.result,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Connector smoke test failed";
    await updateWorkspaceComposioState(params.workspaceId, {
      readiness: "degraded",
      lastError: errorMessage,
      lastValidationError: errorMessage,
    });

    return {
      ok: false,
      status: "failed" as const,
      providerUsed: "composio" as const,
      fallbackUsed: false,
      toolSlug: params.composioToolSlug?.trim() || null,
      latencyMs: Date.now() - startedAt,
      errorMessage,
      result: null,
    };
  }
}
