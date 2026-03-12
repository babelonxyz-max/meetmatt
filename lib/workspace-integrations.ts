import type {
  WorkspaceComposioState,
} from "@/lib/composio";
import {
  getWorkspaceComposioState,
} from "@/lib/composio";
import type {
  WorkspaceSeshChannelState,
  WorkspaceSeshState,
} from "@/lib/sesh";
import {
  getWorkspaceSeshState,
} from "@/lib/sesh";

export type WorkspaceIntegrationStatus = "ready" | "degraded" | "not_configured";

export type ComposioReadinessSummary = {
  status: WorkspaceIntegrationStatus;
  configured: boolean;
  lastValidatedAt: string | null;
  lastError: string | null;
  lastProviderUsed: string | null;
  fallbackCount24h: number;
  connectedProviderCount: number;
  sessionId: string | null;
  warnings: string[];
  blockingIssues: string[];
};

export type WhatsAppReadinessSummary = {
  status: WorkspaceIntegrationStatus;
  configured: boolean;
  connected: boolean;
  provider: string | null;
  endpointUrl: string | null;
  phoneNumberId: string | null;
  webhookReady: boolean;
  inboundReady: boolean;
  outboundReady: boolean;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastError: string | null;
  failedWebhookEvents24h: number;
  warnings: string[];
  blockingIssues: string[];
};

export type WorkspaceIntegrationReadiness = {
  overallStatus: WorkspaceIntegrationStatus;
  composioStatus: WorkspaceIntegrationStatus;
  whatsappStatus: WorkspaceIntegrationStatus;
  warnings: string[];
  blockingIssues: string[];
  composio: ComposioReadinessSummary;
  whatsapp: WhatsAppReadinessSummary;
};

function normalizeTimestampList(value: unknown, limit = 32): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim())
    .slice(-limit);
}

function countRecentTimestamps(values: unknown, maxAgeMs: number): number {
  const now = Date.now();
  return normalizeTimestampList(values).filter((value) => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && now - timestamp <= maxAgeMs;
  }).length;
}

function hasAnyValue(value: WorkspaceSeshChannelState | undefined | null): boolean {
  if (!value) {
    return false;
  }

  return Object.values(value).some((entry) => {
    if (typeof entry === "string") {
      return entry.trim().length > 0;
    }

    if (typeof entry === "boolean") {
      return entry;
    }

    if (Array.isArray(entry)) {
      return entry.length > 0;
    }

    return false;
  });
}

export function evaluateComposioReadiness(
  composioState: WorkspaceComposioState,
): ComposioReadinessSummary {
  const connectedProviderCount = composioState.connectedProviderCount ?? 0;
  const configured = Boolean(
    composioState.enabled ||
      composioState.userId?.trim() ||
      composioState.sessionId?.trim() ||
      connectedProviderCount > 0,
  );
  const warnings = [...(composioState.validationWarnings ?? [])];
  const blockingIssues = [...(composioState.validationErrors ?? [])];
  const fallbackCount24h = countRecentTimestamps(
    composioState.fallbackEventTimestamps,
    24 * 60 * 60 * 1000,
  );
  const lastError =
    composioState.lastValidationError?.trim() ||
    composioState.lastError?.trim() ||
    null;

  if (lastError && !blockingIssues.includes(lastError)) {
    blockingIssues.push(lastError);
  }

  if (fallbackCount24h > 0) {
    warnings.push(
      `${fallbackCount24h} connector fallback${fallbackCount24h === 1 ? "" : "s"} in the last 24h.`,
    );
  }

  const fullyValidated =
    composioState.catalogOk === true &&
    composioState.accountsOk === true &&
    composioState.sessionOk === true &&
    composioState.executionOk === true;

  let status: WorkspaceIntegrationStatus = "not_configured";
  if (configured) {
    status =
      fullyValidated && blockingIssues.length === 0 && fallbackCount24h === 0
        ? "ready"
        : "degraded";
  }

  if (configured && composioState.executionOk !== true) {
    warnings.push("Connector execution has not been fully smoke-tested yet.");
  }

  return {
    status,
    configured,
    lastValidatedAt: composioState.lastValidatedAt?.trim() || null,
    lastError,
    lastProviderUsed: composioState.lastProviderUsed?.trim() || null,
    fallbackCount24h,
    connectedProviderCount,
    sessionId: composioState.sessionId?.trim() || null,
    warnings: Array.from(new Set(warnings)),
    blockingIssues: Array.from(new Set(blockingIssues)),
  };
}

export function evaluateWhatsAppReadiness(
  seshState: WorkspaceSeshState,
): WhatsAppReadinessSummary {
  const whatsapp = seshState.whatsapp ?? {};
  const configured = hasAnyValue(whatsapp);
  const connected = Boolean(whatsapp.enabled && whatsapp.endpointUrl?.trim());
  const endpointUrl = whatsapp.endpointUrl?.trim() || null;
  const webhookReady = Boolean(whatsapp.webhookReady && endpointUrl);
  const inboundReady = Boolean(whatsapp.inboundReady);
  const outboundReady = Boolean(whatsapp.outboundReady);
  const lastError = whatsapp.lastError?.trim() || null;
  const warnings = [...(whatsapp.readinessWarnings ?? [])];
  const blockingIssues = [...(whatsapp.readinessErrors ?? [])];
  const failedWebhookEvents24h = countRecentTimestamps(
    whatsapp.webhookFailureTimestamps,
    24 * 60 * 60 * 1000,
  );

  if (failedWebhookEvents24h > 0) {
    warnings.push(
      `${failedWebhookEvents24h} WhatsApp webhook failure${failedWebhookEvents24h === 1 ? "" : "s"} in the last 24h.`,
    );
  }

  if (lastError && !blockingIssues.includes(lastError)) {
    blockingIssues.push(lastError);
  }

  let status: WorkspaceIntegrationStatus = "not_configured";
  if (configured) {
    status =
      connected &&
      webhookReady &&
      inboundReady &&
      outboundReady &&
      !lastError &&
      failedWebhookEvents24h === 0
        ? "ready"
        : "degraded";
  }

  if (configured && !inboundReady) {
    warnings.push("No inbound WhatsApp webhook has been observed yet.");
  }
  if (configured && !outboundReady) {
    warnings.push("No successful outbound WhatsApp send has been observed yet.");
  }
  if (configured && !webhookReady) {
    warnings.push("WhatsApp webhook registration is incomplete.");
  }

  return {
    status,
    configured,
    connected,
    provider: whatsapp.provider?.trim() || null,
    endpointUrl,
    phoneNumberId: whatsapp.phoneNumberId?.trim() || null,
    webhookReady,
    inboundReady,
    outboundReady,
    lastInboundAt: whatsapp.lastInboundAt?.trim() || null,
    lastOutboundAt: whatsapp.lastOutboundAt?.trim() || null,
    lastError,
    failedWebhookEvents24h,
    warnings: Array.from(new Set(warnings)),
    blockingIssues: Array.from(new Set(blockingIssues)),
  };
}

export function evaluateWorkspaceIntegrationReadinessFromStates(params: {
  composio: WorkspaceComposioState;
  sesh: WorkspaceSeshState;
}): WorkspaceIntegrationReadiness {
  const composio = evaluateComposioReadiness(params.composio);
  const whatsapp = evaluateWhatsAppReadiness(params.sesh);

  let overallStatus: WorkspaceIntegrationStatus = "not_configured";
  if (composio.status === "degraded" || whatsapp.status === "degraded") {
    overallStatus = "degraded";
  } else if (composio.status === "ready" || whatsapp.status === "ready") {
    overallStatus = "ready";
  }

  return {
    overallStatus,
    composioStatus: composio.status,
    whatsappStatus: whatsapp.status,
    warnings: Array.from(new Set([...composio.warnings, ...whatsapp.warnings])),
    blockingIssues: Array.from(
      new Set([...composio.blockingIssues, ...whatsapp.blockingIssues]),
    ),
    composio,
    whatsapp,
  };
}

export async function getWorkspaceIntegrationReadiness(
  workspaceId: string,
): Promise<WorkspaceIntegrationReadiness> {
  const [composio, sesh] = await Promise.all([
    getWorkspaceComposioState(workspaceId),
    getWorkspaceSeshState(workspaceId),
  ]);

  return evaluateWorkspaceIntegrationReadinessFromStates({
    composio,
    sesh,
  });
}
