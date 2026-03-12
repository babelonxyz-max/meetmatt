import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

export type WorkspaceSeshChannelState = {
  provider?: string | null;
  providerType?: string | null;
  enabled?: boolean;
  configuredAt?: string;
  configuredByUserId?: string | null;
  defaultUserId?: string | null;
  defaultRole?: string | null;
  endpointToken?: string | null;
  endpointUrl?: string | null;
  verifyToken?: string | null;
  phoneNumberId?: string | null;
  businessAccountId?: string | null;
  connectedProviders?: string[];
  connectedProviderCount?: number;
  webhookReady?: boolean;
  inboundReady?: boolean;
  outboundReady?: boolean;
  lastInboundAt?: string;
  lastOutboundAt?: string;
  lastFallbackAt?: string;
  fallbackCount?: number;
  webhookFailureTimestamps?: string[];
  readinessWarnings?: string[];
  readinessErrors?: string[];
  lastActionAt?: string;
  lastError?: string | null;
};

export type WorkspaceSeshWebhookState = {
  id?: string | null;
  name?: string | null;
  url?: string | null;
  createdAt?: string;
  events?: string[];
};

export type WorkspaceSeshState = {
  templeId?: string;
  templeName?: string;
  provisionedAt?: string;
  dodoConfiguredAt?: string;
  whatsapp?: WorkspaceSeshChannelState;
  composioFallback?: WorkspaceSeshChannelState;
  webhooks?: {
    whatsapp?: WorkspaceSeshWebhookState;
    composioFallback?: WorkspaceSeshWebhookState;
  };
};

type WorkspaceMetadata = JsonRecord & {
  sesh?: WorkspaceSeshState;
};

type SeshTempleResponse = {
  success: boolean;
  temple: {
    id: string;
    name: string;
  };
};

type SeshActionEnvelope<T> = {
  success: boolean;
  provider: string;
  action: string;
  result: T;
  timestamp: string;
};

type SeshDodoCheckoutResult = {
  success: boolean;
  sessionId?: string;
  checkoutUrl?: string;
  session?: {
    session_id?: string;
    checkout_url?: string;
    expires_at?: string | null;
    [key: string]: unknown;
  };
};

type SeshDodoWebhookVerificationResult = {
  verified: boolean;
  event?: Record<string, unknown>;
  error?: string;
};

type SeshProviderListResponse = {
  providers?: Array<Record<string, unknown>>;
  count?: number;
};

type SeshOAuthStartResponse = {
  success: boolean;
  url?: string;
  sessionId?: string;
  redirectUrl?: string;
  [key: string]: unknown;
};

type SeshWebhookEndpointResponse = {
  success?: boolean;
  endpoint?: Record<string, unknown>;
  endpointUrl?: string;
};

type SeshAdminWebhookResponse = {
  success?: boolean;
  webhook?: {
    id?: string;
    name?: string;
    url?: string;
    created_at?: string;
    events?: string[];
    [key: string]: unknown;
  };
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

function readWorkspaceSeshState(value: Prisma.JsonValue | null): WorkspaceSeshState {
  const metadata = readWorkspaceMetadata(value);
  return isRecord(metadata.sesh as Prisma.JsonValue | null)
    ? (metadata.sesh as WorkspaceSeshState)
    : {};
}

function mergeWorkspaceSeshState(
  existing: Prisma.JsonValue | null,
  patch: Partial<WorkspaceSeshState>,
): Prisma.InputJsonValue {
  const metadata = readWorkspaceMetadata(existing);
  return JSON.parse(
    JSON.stringify({
      ...metadata,
      sesh: {
        ...readWorkspaceSeshState(existing),
        ...patch,
      },
    }),
  ) as Prisma.InputJsonValue;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function isSeshAdminConfigured(): boolean {
  return Boolean(process.env.SESH_BASE_URL?.trim() && process.env.SESH_ADMIN_KEY?.trim());
}

function getSeshBaseUrl(): string {
  const baseUrl = process.env.SESH_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("SESH_BASE_URL is not configured");
  }

  return normalizeBaseUrl(baseUrl);
}

function getSeshAdminKey(): string {
  const adminKey = process.env.SESH_ADMIN_KEY?.trim();
  if (!adminKey) {
    throw new Error("SESH_ADMIN_KEY is not configured");
  }

  return adminKey;
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

async function seshAdminRequest<T>(
  path: string,
  init: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    query?: Record<string, string | number | boolean | null | undefined>;
  } = {},
): Promise<T> {
  const response = await fetch(
    `${getSeshBaseUrl()}${path}${buildQueryString(init.query)}`,
    {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": getSeshAdminKey(),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText ||
        `SESH request failed: ${init.method ?? "GET"} ${path} (${response.status})`,
    );
  }

  return (await response.json()) as T;
}

function buildTempleName(workspaceName: string): string {
  const trimmed = workspaceName.trim();
  return trimmed.length > 0 ? `MeetMatt ${trimmed}` : "MeetMatt Workspace";
}

function buildDodoEnvironment(): "live_mode" | "test_mode" {
  const raw = process.env.DODO_PAYMENTS_MODE?.trim().toLowerCase();
  return raw === "test" || raw === "test_mode" ? "test_mode" : "live_mode";
}

function buildWorkspaceDodoBootstrapConfig():
  | {
      apiKey: string;
      webhookSecret?: string;
      environment: "live_mode" | "test_mode";
    }
  | null {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim();
  return {
    apiKey,
    ...(webhookSecret ? { webhookSecret } : {}),
    environment: buildDodoEnvironment(),
  };
}

export async function getWorkspaceSeshState(workspaceId: string): Promise<WorkspaceSeshState> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { metadata: true },
  });

  return readWorkspaceSeshState(workspace?.metadata ?? null);
}

export async function updateWorkspaceSeshState(
  workspaceId: string,
  patch: Partial<WorkspaceSeshState>,
): Promise<WorkspaceSeshState> {
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
      metadata: mergeWorkspaceSeshState(workspace.metadata, patch),
    },
    select: { metadata: true },
  });

  return readWorkspaceSeshState(updated.metadata);
}

export async function ensureWorkspaceSeshTemple(workspaceId: string): Promise<{
  templeId: string;
  templeName: string;
}> {
  if (!isSeshAdminConfigured()) {
    throw new Error("SESH admin integration is not configured");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      slug: true,
      name: true,
      metadata: true,
    },
  });

  if (!workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`);
  }

  const seshState = readWorkspaceSeshState(workspace.metadata);
  if (seshState.templeId?.trim()) {
    return {
      templeId: seshState.templeId.trim(),
      templeName: seshState.templeName?.trim() || buildTempleName(workspace.name),
    };
  }

  const created = await seshAdminRequest<SeshTempleResponse>("/admin/temples", {
    method: "POST",
    body: {
      name: buildTempleName(workspace.name),
      description: `MeetMatt workspace ${workspace.slug}`,
    },
  });

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      metadata: mergeWorkspaceSeshState(workspace.metadata, {
        templeId: created.temple.id,
        templeName: created.temple.name,
        provisionedAt: new Date().toISOString(),
      }),
    },
  });

  return {
    templeId: created.temple.id,
    templeName: created.temple.name,
  };
}

export async function listSeshProviders(params?: {
  q?: string;
  category?: string;
  importable?: boolean;
  runtime?: boolean;
}): Promise<Array<Record<string, unknown>>> {
  const response = await seshAdminRequest<SeshProviderListResponse>(
    "/admin/integrations/providers",
    {
      query: {
        q: params?.q,
        category: params?.category,
        importable:
          typeof params?.importable === "boolean" ? params.importable : undefined,
        runtime: typeof params?.runtime === "boolean" ? params.runtime : undefined,
      },
    },
  );

  return response.providers ?? [];
}

export async function listWorkspaceSeshIntegrations(workspaceId: string): Promise<{
  templeId: string;
  integrations: Array<Record<string, unknown>>;
}> {
  const temple = await ensureWorkspaceSeshTemple(workspaceId);
  const response = await seshAdminRequest<{
    temple_id?: string;
    integrations?: Array<Record<string, unknown>>;
  }>(`/admin/integrations/temple/${temple.templeId}`);

  return {
    templeId: response.temple_id ?? temple.templeId,
    integrations: response.integrations ?? [],
  };
}

export async function configureWorkspaceSeshIntegration(params: {
  workspaceId: string;
  provider: string;
  config: Record<string, unknown>;
  enabled?: boolean;
}) {
  const temple = await ensureWorkspaceSeshTemple(params.workspaceId);
  return seshAdminRequest<Record<string, unknown>>(
    `/admin/integrations/temple/${temple.templeId}/${params.provider}`,
    {
      method: "POST",
      body: {
        config: params.config,
        enabled: params.enabled !== false,
      },
    },
  );
}

export async function importWorkspaceSeshIntegration(params: {
  workspaceId: string;
  provider: string;
  config: Record<string, unknown>;
  enabled?: boolean;
  providerName?: string;
}) {
  const temple = await ensureWorkspaceSeshTemple(params.workspaceId);
  return seshAdminRequest<Record<string, unknown>>(
    `/admin/integrations/temple/${temple.templeId}/import/${params.provider}`,
    {
      method: "POST",
      body: {
        config: params.config,
        enabled: params.enabled !== false,
        providerName: params.providerName,
      },
    },
  );
}

export async function startWorkspaceSeshOAuth(params: {
  workspaceId: string;
  provider: string;
  providerName?: string;
  authorizeUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scopes?: string[];
  redirectUri?: string;
  extraAuthorizeParams?: Record<string, unknown>;
  extraTokenParams?: Record<string, unknown>;
  configPatch?: Record<string, unknown>;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  usePkce?: boolean;
}): Promise<SeshOAuthStartResponse> {
  const temple = await ensureWorkspaceSeshTemple(params.workspaceId);
  return seshAdminRequest<SeshOAuthStartResponse>(
    `/admin/integrations/oauth/${params.provider}/start`,
    {
      method: "POST",
      body: {
        templeId: temple.templeId,
        providerName: params.providerName,
        authorizeUrl: params.authorizeUrl,
        tokenUrl: params.tokenUrl,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        scopes: params.scopes,
        redirectUri: params.redirectUri,
        extraAuthorizeParams: params.extraAuthorizeParams,
        extraTokenParams: params.extraTokenParams,
        configPatch: params.configPatch,
        successRedirectUrl: params.successRedirectUrl,
        failureRedirectUrl: params.failureRedirectUrl,
        usePkce: params.usePkce,
      },
    },
  );
}

export async function listWorkspaceSeshOAuthConnections(params: {
  workspaceId: string;
  provider: string;
}) {
  const temple = await ensureWorkspaceSeshTemple(params.workspaceId);
  return seshAdminRequest<{ connections?: Array<Record<string, unknown>> }>(
    `/admin/integrations/oauth/${params.provider}/connections`,
    {
      query: {
        templeId: temple.templeId,
      },
    },
  );
}

export async function createWorkspaceSeshWebhookEndpoint(params: {
  workspaceId: string;
  provider: string;
  providerName?: string;
  events?: string[];
  config?: Record<string, unknown>;
  endpointToken?: string;
}) {
  const temple = await ensureWorkspaceSeshTemple(params.workspaceId);
  return seshAdminRequest<SeshWebhookEndpointResponse>(
    `/admin/integrations/temple/${temple.templeId}/${params.provider}/webhooks`,
    {
      method: "POST",
      body: {
        providerName: params.providerName,
        events: params.events,
        config: params.config,
        endpointToken: params.endpointToken,
      },
    },
  );
}

export async function registerWorkspaceSeshAdminWebhook(params: {
  workspaceId: string;
  name: string;
  url: string;
  secret?: string;
  events?: string[];
}) {
  const temple = await ensureWorkspaceSeshTemple(params.workspaceId);
  return seshAdminRequest<SeshAdminWebhookResponse>("/admin/webhooks", {
    method: "POST",
    body: {
      temple_id: temple.templeId,
      name: params.name,
      url: params.url,
      secret: params.secret,
      events: params.events ?? ["*"],
    },
  });
}

export async function executeWorkspaceSeshAction<T>(params: {
  workspaceId: string;
  provider: string;
  action: string;
  args?: unknown[];
  ensureProvider?: () => Promise<void>;
}): Promise<T> {
  if (!isSeshAdminConfigured()) {
    throw new Error("SESH admin integration is not configured");
  }

  if (params.ensureProvider) {
    await params.ensureProvider();
  }

  const temple = await ensureWorkspaceSeshTemple(params.workspaceId);
  const response = await seshAdminRequest<SeshActionEnvelope<T>>(
    `/admin/integrations/temple/${temple.templeId}/${params.provider}/actions/${params.action}`,
    {
      method: "POST",
      body: params.args ? { args: params.args } : {},
    },
  );

  return response.result;
}

export async function ensureWorkspaceSeshDodoIntegration(
  workspaceId: string,
): Promise<{ templeId: string; templeName: string }> {
  const temple = await ensureWorkspaceSeshTemple(workspaceId);
  const config = buildWorkspaceDodoBootstrapConfig();

  if (!config) {
    return temple;
  }

  await configureWorkspaceSeshIntegration({
    workspaceId,
    provider: "dodo",
    config,
    enabled: true,
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { metadata: true },
  });

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      metadata: mergeWorkspaceSeshState(workspace?.metadata ?? null, {
        templeId: temple.templeId,
        templeName: temple.templeName,
        dodoConfiguredAt: new Date().toISOString(),
      }),
    },
  });

  return temple;
}

export async function createWorkspaceDodoCheckoutSession(params: {
  workspaceId: string;
  productCart: Array<{ product_id: string; quantity?: number }>;
  customer: {
    email?: string | null;
    name?: string | null;
  };
  returnUrl: string;
  options?: Record<string, unknown>;
}): Promise<SeshDodoCheckoutResult> {
  const customer = {
    ...(params.customer.email ? { email: params.customer.email } : {}),
    ...(params.customer.name ? { name: params.customer.name } : {}),
  };

  return executeWorkspaceSeshAction<SeshDodoCheckoutResult>({
    workspaceId: params.workspaceId,
    provider: "dodo",
    action: "createCheckoutSession",
    args: [params.productCart, customer, params.returnUrl, params.options ?? {}],
    ensureProvider: async () => {
      await ensureWorkspaceSeshDodoIntegration(params.workspaceId);
    },
  });
}

export async function verifyWorkspaceDodoWebhookViaSesh(params: {
  workspaceId: string;
  payload: string;
  headers: Record<string, string>;
}): Promise<SeshDodoWebhookVerificationResult> {
  return executeWorkspaceSeshAction<SeshDodoWebhookVerificationResult>({
    workspaceId: params.workspaceId,
    provider: "dodo",
    action: "verifyWebhook",
    args: [params.payload, params.headers],
    ensureProvider: async () => {
      await ensureWorkspaceSeshDodoIntegration(params.workspaceId);
    },
  });
}
