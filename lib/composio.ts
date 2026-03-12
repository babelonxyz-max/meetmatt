import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

export type WorkspaceComposioState = {
  enabled?: boolean;
  mode?: "primary" | "fallback";
  userId?: string;
  sessionId?: string;
  sessionPayload?: Record<string, unknown>;
  sessionCreatedAt?: string;
  allowedToolkits?: string[];
  connectedAccountIds?: string[];
  connectedProviders?: string[];
  connectedProviderCount?: number;
  lastActionAt?: string;
  lastValidatedAt?: string;
  catalogOk?: boolean;
  accountsOk?: boolean;
  sessionOk?: boolean;
  executionOk?: boolean;
  readiness?: "ready" | "degraded" | "not_configured";
  validationWarnings?: string[];
  validationErrors?: string[];
  lastValidationError?: string | null;
  lastProviderUsed?: "composio" | "sesh";
  lastFallbackAt?: string;
  lastFallbackReason?: string | null;
  fallbackCount?: number;
  fallbackEventTimestamps?: string[];
  lastResolvedPaths?: {
    catalog?: string | null;
    accounts?: string | null;
    session?: string | null;
    execution?: string | null;
  };
  lastError?: string | null;
};

type WorkspaceMetadata = JsonRecord & {
  composio?: WorkspaceComposioState;
};

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readWorkspaceMetadata(value: Prisma.JsonValue | null): WorkspaceMetadata {
  if (!isRecord(value)) {
    return {};
  }

  return value as WorkspaceMetadata;
}

function readWorkspaceComposioState(value: Prisma.JsonValue | null): WorkspaceComposioState {
  const metadata = readWorkspaceMetadata(value);
  return isRecord(metadata.composio as Prisma.JsonValue | null)
    ? (metadata.composio as WorkspaceComposioState)
    : {};
}

function mergeWorkspaceComposioState(
  existing: Prisma.JsonValue | null,
  patch: Partial<WorkspaceComposioState>,
): Prisma.InputJsonValue {
  const metadata = readWorkspaceMetadata(existing);
  return JSON.parse(
    JSON.stringify({
      ...metadata,
      composio: {
        ...readWorkspaceComposioState(existing),
        ...patch,
      },
    }),
  ) as Prisma.InputJsonValue;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY?.trim());
}

function getComposioBaseUrl(): string {
  const configured = process.env.COMPOSIO_BASE_URL?.trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  return "https://backend.composio.dev";
}

function getComposioApiKey(): string {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is not configured");
  }

  return apiKey;
}

function buildQueryString(query?: Record<string, string | number | boolean | null | undefined>) {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }
    params.set(key, String(value));
  }

  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

async function composioRequest<T>(params: {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
}): Promise<T> {
  const response = await fetch(
    `${getComposioBaseUrl()}${params.path}${buildQueryString(params.query)}`,
    {
      method: params.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getComposioApiKey(),
      },
      body: params.body !== undefined ? JSON.stringify(params.body) : undefined,
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText ||
        `Composio request failed: ${params.method ?? "GET"} ${params.path} (${response.status})`,
    );
  }

  return (await response.json()) as T;
}

async function composioRequestWithFallbackPathResult<T>(params: {
  paths: string[];
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
}): Promise<{ data: T; path: string }> {
  let lastError: unknown = null;

  for (const path of params.paths) {
    try {
      const data = await composioRequest<T>({
        path,
        method: params.method,
        body: params.body,
        query: params.query,
      });
      return { data, path };
    } catch (error: unknown) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Composio request failed");
}

function normalizeStringArray(value: unknown, limit = 24): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim())
    .slice(-limit);
}

export function buildWorkspaceComposioUserId(workspaceId: string): string {
  return `meetmatt:workspace:${workspaceId}`;
}

export async function getWorkspaceComposioState(
  workspaceId: string,
): Promise<WorkspaceComposioState> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { metadata: true },
  });

  return readWorkspaceComposioState(workspace?.metadata ?? null);
}

export async function updateWorkspaceComposioState(
  workspaceId: string,
  patch: Partial<WorkspaceComposioState>,
): Promise<WorkspaceComposioState> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, metadata: true },
  });

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const updated = await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      metadata: mergeWorkspaceComposioState(workspace.metadata, patch),
    },
    select: { metadata: true },
  });

  return readWorkspaceComposioState(updated.metadata);
}

export async function listComposioToolkits(params?: {
  q?: string;
  category?: string;
  limit?: number;
}): Promise<Array<Record<string, unknown>>> {
  const response = await composioRequestWithFallbackPathResult<{
    items?: Array<Record<string, unknown>>;
    toolkits?: Array<Record<string, unknown>>;
  }>({
    paths: ["/api/v3/toolkits", "/api/v3/toolkits/list"],
    query: {
      q: params?.q,
      search: params?.q,
      category: params?.category,
      limit: params?.limit,
    },
  });

  return response.data.items ?? response.data.toolkits ?? [];
}

export async function listWorkspaceComposioConnectedAccounts(params: {
  workspaceId: string;
  toolkitSlug?: string;
}) {
  const composioUserId = buildWorkspaceComposioUserId(params.workspaceId);
  const response = await composioRequestWithFallbackPathResult<{
    items?: Array<Record<string, unknown>>;
    connected_accounts?: Array<Record<string, unknown>>;
  }>({
    paths: ["/api/v3/connected_accounts"],
    query: {
      user_id: composioUserId,
      toolkit_slug: params.toolkitSlug,
    },
  });

  const accounts = response.data.items ?? response.data.connected_accounts ?? [];
  const providers = Array.from(
    new Set(
      accounts
        .map((account) => {
          const toolkit = account.toolkit;
          if (typeof toolkit === "string" && toolkit.trim()) {
            return toolkit.trim();
          }

          if (isRecord(toolkit) && typeof toolkit.slug === "string") {
            return toolkit.slug.trim();
          }

          if (typeof account.toolkit_slug === "string" && account.toolkit_slug.trim()) {
            return account.toolkit_slug.trim();
          }

          return null;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  );

  await updateWorkspaceComposioState(params.workspaceId, {
    enabled: true,
    mode: "primary",
    connectedProviders: providers,
    connectedProviderCount: providers.length,
    lastResolvedPaths: {
      ...(await getWorkspaceComposioState(params.workspaceId)).lastResolvedPaths,
      accounts: response.path,
    },
  });

  return accounts;
}

type WorkspaceComposioSessionResponse = {
  session_id?: string;
  sessionId?: string;
  id?: string;
  session?: {
    id?: string;
    session_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function readSessionId(response: WorkspaceComposioSessionResponse): string | null {
  if (typeof response.session_id === "string" && response.session_id.trim()) {
    return response.session_id.trim();
  }
  if (typeof response.sessionId === "string" && response.sessionId.trim()) {
    return response.sessionId.trim();
  }
  if (typeof response.id === "string" && response.id.trim()) {
    return response.id.trim();
  }
  if (isRecord(response.session)) {
    if (typeof response.session.id === "string" && response.session.id.trim()) {
      return response.session.id.trim();
    }
    if (
      typeof response.session.session_id === "string" &&
      response.session.session_id.trim()
    ) {
      return response.session.session_id.trim();
    }
  }
  return null;
}

export async function createWorkspaceComposioSession(params: {
  workspaceId: string;
  toolkits?: string[];
  tools?: string[];
  connectedAccountIds?: string[];
  force?: boolean;
}): Promise<WorkspaceComposioSessionResponse & { sessionId: string }> {
  const current = await getWorkspaceComposioState(params.workspaceId);

  if (!params.force && current.sessionId?.trim()) {
    return {
      ...(current.sessionPayload ?? {}),
      sessionId: current.sessionId.trim(),
    };
  }

  const response = await composioRequestWithFallbackPathResult<WorkspaceComposioSessionResponse>({
    paths: ["/api/v3/tool_router/session"],
    method: "POST",
    body: {
      user_id: buildWorkspaceComposioUserId(params.workspaceId),
      allowed_toolkits: params.toolkits ?? current.allowedToolkits ?? undefined,
      tools: params.tools ?? undefined,
      connected_account_ids:
        params.connectedAccountIds ?? current.connectedAccountIds ?? undefined,
      dangerously_disable_triggers: false,
    },
  });

  const sessionId = readSessionId(response.data);
  if (!sessionId) {
    throw new Error("Composio session response did not include a session id");
  }

  await updateWorkspaceComposioState(params.workspaceId, {
    enabled: true,
    mode: "primary",
    userId: buildWorkspaceComposioUserId(params.workspaceId),
    sessionId,
    sessionPayload: response.data,
    sessionCreatedAt: new Date().toISOString(),
    allowedToolkits: params.toolkits ?? current.allowedToolkits ?? [],
    connectedAccountIds:
      params.connectedAccountIds ?? current.connectedAccountIds ?? [],
    lastResolvedPaths: {
      ...(current.lastResolvedPaths ?? {}),
      session: response.path,
    },
  });

  return {
    ...response.data,
    sessionId,
  };
}

export async function ensureWorkspaceComposioSession(params: {
  workspaceId: string;
  toolkits?: string[];
  tools?: string[];
  connectedAccountIds?: string[];
}): Promise<string> {
  const session = await createWorkspaceComposioSession({
    workspaceId: params.workspaceId,
    toolkits: params.toolkits,
    tools: params.tools,
    connectedAccountIds: params.connectedAccountIds,
  });

  return session.sessionId;
}

export async function executeWorkspaceComposioTool(params: {
  workspaceId: string;
  toolSlug: string;
  input?: Record<string, unknown>;
  toolkits?: string[];
}): Promise<Record<string, unknown>> {
  const sessionId = await ensureWorkspaceComposioSession({
    workspaceId: params.workspaceId,
    toolkits: params.toolkits,
  });

  const result = await composioRequestWithFallbackPathResult<Record<string, unknown>>({
    paths: [
      `/api/v3/tool_router/${sessionId}/tool/${params.toolSlug}/execute`,
      `/api/v3/tool_router/${sessionId}/tools/${params.toolSlug}/execute`,
    ],
    method: "POST",
    body: {
      input: params.input ?? {},
    },
  });

  await updateWorkspaceComposioState(params.workspaceId, {
    enabled: true,
    mode: "primary",
    lastActionAt: new Date().toISOString(),
    executionOk: true,
    sessionOk: true,
    lastProviderUsed: "composio",
    lastError: null,
    lastResolvedPaths: {
      ...(await getWorkspaceComposioState(params.workspaceId)).lastResolvedPaths,
      execution: result.path,
    },
  });

  return result.data;
}

function classifyComposioReadiness(params: {
  configured: boolean;
  catalogOk: boolean;
  accountsOk: boolean;
  sessionOk: boolean;
  executionOk: boolean;
  warnings: string[];
  errors: string[];
}): "ready" | "degraded" | "not_configured" {
  if (!params.configured) {
    return "not_configured";
  }

  if (
    params.catalogOk &&
    params.accountsOk &&
    params.sessionOk &&
    params.executionOk &&
    params.warnings.length === 0 &&
    params.errors.length === 0
  ) {
    return "ready";
  }

  return "degraded";
}

export async function probeComposioApiCompatibility() {
  const toolkitProbe = await composioRequestWithFallbackPathResult<{
    items?: Array<Record<string, unknown>>;
    toolkits?: Array<Record<string, unknown>>;
  }>({
    paths: ["/api/v3/toolkits", "/api/v3/toolkits/list"],
    query: {
      limit: 1,
    },
  });

  const items = toolkitProbe.data.items ?? toolkitProbe.data.toolkits ?? [];

  return {
    catalogOk: true,
    catalogPath: toolkitProbe.path,
    toolkitCount: items.length,
  };
}

export async function recordWorkspaceComposioFallbackEvent(params: {
  workspaceId: string;
  reason: string;
  provider?: string | null;
}) {
  const current = await getWorkspaceComposioState(params.workspaceId);
  const now = new Date().toISOString();

  return updateWorkspaceComposioState(params.workspaceId, {
    enabled: true,
    mode: "primary",
    readiness: "degraded",
    lastProviderUsed: params.provider?.trim() === "sesh" ? "sesh" : current.lastProviderUsed,
    lastFallbackAt: now,
    lastFallbackReason: params.reason,
    fallbackCount: (current.fallbackCount ?? 0) + 1,
    fallbackEventTimestamps: [...normalizeStringArray(current.fallbackEventTimestamps), now],
    lastError: params.reason,
  });
}

export async function validateWorkspaceComposioReadiness(params: {
  workspaceId: string;
  toolkits?: string[];
  tools?: string[];
  connectedAccountIds?: string[];
  smokeTestToolSlug?: string | null;
  smokeTestInput?: Record<string, unknown>;
}) {
  const current = await getWorkspaceComposioState(params.workspaceId);
  const warnings: string[] = [];
  const errors: string[] = [];
  const now = new Date().toISOString();

  if (!isComposioConfigured()) {
    const readiness = classifyComposioReadiness({
      configured: false,
      catalogOk: false,
      accountsOk: false,
      sessionOk: false,
      executionOk: false,
      warnings,
      errors: ["COMPOSIO_API_KEY is not configured."],
    });

    await updateWorkspaceComposioState(params.workspaceId, {
      enabled: false,
      readiness,
      lastValidatedAt: now,
      catalogOk: false,
      accountsOk: false,
      sessionOk: false,
      executionOk: false,
      validationWarnings: warnings,
      validationErrors: ["COMPOSIO_API_KEY is not configured."],
      lastValidationError: "COMPOSIO_API_KEY is not configured.",
    });

    return {
      workspaceId: params.workspaceId,
      readiness,
      catalogOk: false,
      accountsOk: false,
      sessionOk: false,
      executionOk: false,
      warnings,
      errors: ["COMPOSIO_API_KEY is not configured."],
    };
  }

  let catalogOk = false;
  let accountsOk = false;
  let sessionOk = false;
  let executionOk = false;
  let catalogPath: string | null = null;
  let accountsPath = current.lastResolvedPaths?.accounts ?? null;
  let sessionPath = current.lastResolvedPaths?.session ?? null;
  let executionPath = current.lastResolvedPaths?.execution ?? null;

  try {
    const compatibility = await probeComposioApiCompatibility();
    catalogOk = compatibility.catalogOk;
    catalogPath = compatibility.catalogPath;
  } catch (error: unknown) {
    errors.push(error instanceof Error ? error.message : "Failed to list Composio toolkits.");
  }

  try {
    const accountResult = await composioRequestWithFallbackPathResult<{
      items?: Array<Record<string, unknown>>;
      connected_accounts?: Array<Record<string, unknown>>;
    }>({
      paths: ["/api/v3/connected_accounts"],
      query: {
        user_id: buildWorkspaceComposioUserId(params.workspaceId),
      },
    });
    accountsOk = true;
    accountsPath = accountResult.path;
    const accounts = accountResult.data.items ?? accountResult.data.connected_accounts ?? [];
    const connectedProviders = Array.from(
      new Set(
        accounts
          .map((account) => {
            const toolkit = account.toolkit;
            if (typeof toolkit === "string" && toolkit.trim()) {
              return toolkit.trim();
            }

            if (isRecord(toolkit) && typeof toolkit.slug === "string") {
              return toolkit.slug.trim();
            }

            if (
              typeof account.toolkit_slug === "string" &&
              account.toolkit_slug.trim()
            ) {
              return account.toolkit_slug.trim();
            }

            return null;
          })
          .filter((value): value is string => Boolean(value)),
      ),
    );

    await updateWorkspaceComposioState(params.workspaceId, {
      connectedProviders,
      connectedProviderCount: connectedProviders.length,
    });
  } catch (error: unknown) {
    errors.push(
      error instanceof Error
        ? error.message
        : "Failed to list workspace Composio connected accounts.",
    );
  }

  try {
    const session = await createWorkspaceComposioSession({
      workspaceId: params.workspaceId,
      toolkits: params.toolkits,
      tools: params.tools,
      connectedAccountIds: params.connectedAccountIds,
    });
    sessionOk = Boolean(session.sessionId);
    const updated = await getWorkspaceComposioState(params.workspaceId);
    sessionPath = updated.lastResolvedPaths?.session ?? sessionPath;
  } catch (error: unknown) {
    errors.push(error instanceof Error ? error.message : "Failed to create a Composio session.");
  }

  if (params.smokeTestToolSlug?.trim()) {
    try {
      await executeWorkspaceComposioTool({
        workspaceId: params.workspaceId,
        toolSlug: params.smokeTestToolSlug.trim(),
        input: params.smokeTestInput ?? {},
        toolkits: params.toolkits,
      });
      executionOk = true;
      const updated = await getWorkspaceComposioState(params.workspaceId);
      executionPath = updated.lastResolvedPaths?.execution ?? executionPath;
    } catch (error: unknown) {
      errors.push(
        error instanceof Error
          ? error.message
          : "Failed to execute the Composio smoke-test tool.",
      );
    }
  } else {
    warnings.push("Execution smoke test skipped because no tool slug was provided.");
  }

  const readiness = classifyComposioReadiness({
    configured: true,
    catalogOk,
    accountsOk,
    sessionOk,
    executionOk,
    warnings,
    errors,
  });
  const lastValidationError = errors[0] ?? null;

  await updateWorkspaceComposioState(params.workspaceId, {
    enabled: true,
    mode: "primary",
    userId: buildWorkspaceComposioUserId(params.workspaceId),
    readiness,
    lastValidatedAt: now,
    catalogOk,
    accountsOk,
    sessionOk,
    executionOk,
    validationWarnings: warnings,
    validationErrors: errors,
    lastValidationError,
    lastResolvedPaths: {
      ...(current.lastResolvedPaths ?? {}),
      ...(catalogPath ? { catalog: catalogPath } : {}),
      ...(accountsPath ? { accounts: accountsPath } : {}),
      ...(sessionPath ? { session: sessionPath } : {}),
      ...(executionPath ? { execution: executionPath } : {}),
    },
    lastError: lastValidationError,
  });

  const updated = await getWorkspaceComposioState(params.workspaceId);

  return {
    workspaceId: params.workspaceId,
    readiness,
    catalogOk,
    accountsOk,
    sessionOk,
    executionOk,
    warnings,
    errors,
    lastValidatedAt: updated.lastValidatedAt ?? now,
    lastResolvedPaths: updated.lastResolvedPaths ?? null,
    connectedProviderCount: updated.connectedProviderCount ?? 0,
    connectedProviders: updated.connectedProviders ?? [],
    sessionId: updated.sessionId ?? null,
  };
}
