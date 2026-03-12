import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  createWorkspaceSeshWebhookEndpoint,
  importWorkspaceSeshIntegration,
  registerWorkspaceSeshAdminWebhook,
  type WorkspaceSeshChannelState,
  getWorkspaceSeshState,
  executeWorkspaceSeshAction,
  updateWorkspaceSeshState,
} from "@/lib/sesh";
import {
  evaluateWhatsAppReadiness,
} from "@/lib/workspace-integrations";

export type WhatsAppConnectionResult = {
  provider: string;
  endpointUrl: string | null;
  endpointToken: string | null;
  verifyToken: string;
  adminWebhookUrl: string | null;
};

export type NormalizedWhatsAppMessage = {
  externalThreadId: string;
  externalUserId: string;
  messageId: string | null;
  text: string;
  title: string;
  contactName: string | null;
  receivedAt: Date | null;
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

async function updateWorkspaceWhatsAppState(
  workspaceId: string,
  patch: Partial<WorkspaceSeshChannelState>,
) {
  const current = await getWorkspaceSeshState(workspaceId);
  const whatsapp: WorkspaceSeshChannelState = {
    ...(current.whatsapp ?? {}),
    ...patch,
  };

  return updateWorkspaceSeshState(workspaceId, {
    whatsapp,
  });
}

function buildMeetMattBaseUrl(): string | null {
  const raw =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    null;
  return raw ? raw.replace(/\/+$/, "") : null;
}

function generateVerifyToken() {
  return `matt-wa-${randomBytes(12).toString("hex")}`;
}

export function buildWhatsAppSeshConfig(params: {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string | null;
  webhookSecret?: string | null;
}) {
  return {
    providerType: "http-api",
    catalogSlug: "whatsapp",
    displayName: "WhatsApp Business",
    baseUrl: "https://graph.facebook.com/v23.0",
    authType: "bearer",
    authToken: params.accessToken,
    apiKey: params.accessToken,
    phoneNumberId: params.phoneNumberId,
    businessAccountId: params.businessAccountId ?? undefined,
    webhookSecret: params.webhookSecret ?? undefined,
    defaultHeaders: {
      "Content-Type": "application/json",
    },
    healthPath: `/${params.phoneNumberId}`,
  };
}

export async function connectWorkspaceWhatsAppChannel(params: {
  workspaceId: string;
  configuredByUserId: string;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string | null;
  webhookSecret?: string | null;
  verifyToken?: string | null;
  defaultRole?: string | null;
}) {
  const verifyToken = params.verifyToken?.trim() || generateVerifyToken();
  const fallbackWebhookSecret = process.env.MEETMATT_SESH_WEBHOOK_SECRET?.trim() || "";
  const appBaseUrl = buildMeetMattBaseUrl();
  const configuredAt = new Date().toISOString();
  const readinessWarnings: string[] = [];
  const readinessErrors: string[] = [];

  if (!appBaseUrl) {
    readinessWarnings.push(
      "APP_BASE_URL or NEXT_PUBLIC_APP_URL is missing, so the Sesh admin webhook could not be registered.",
    );
  }
  if (!fallbackWebhookSecret) {
    readinessErrors.push(
      "MEETMATT_SESH_WEBHOOK_SECRET is missing, so inbound forwarding is incomplete.",
    );
  }

  await importWorkspaceSeshIntegration({
    workspaceId: params.workspaceId,
    provider: "whatsapp",
    config: buildWhatsAppSeshConfig({
      accessToken: params.accessToken,
      phoneNumberId: params.phoneNumberId,
      businessAccountId: params.businessAccountId,
      webhookSecret: params.webhookSecret,
    }),
    enabled: true,
  });

  const inboundWebhook = await createWorkspaceSeshWebhookEndpoint({
    workspaceId: params.workspaceId,
    provider: "whatsapp",
    events: ["*"],
    config: {
      verifyToken,
      challengeQueryParam: "hub.challenge",
      verifyTokenQueryParam: "hub.verify_token",
      signatureHeader: "x-hub-signature-256",
      signatureFormat: "sha256-prefix",
      ...(params.webhookSecret?.trim()
        ? {
            signingSecret: params.webhookSecret.trim(),
          }
        : {}),
    },
  });

  let adminWebhookUrl: string | null = null;
  let webhookReady = false;
  if (appBaseUrl && fallbackWebhookSecret) {
    adminWebhookUrl = `${appBaseUrl}/api/webhooks/sesh/whatsapp?workspaceId=${encodeURIComponent(
      params.workspaceId,
    )}`;

    const adminWebhook = await registerWorkspaceSeshAdminWebhook({
      workspaceId: params.workspaceId,
      name: `MeetMatt WhatsApp ${params.workspaceId.slice(0, 8)}`,
      url: adminWebhookUrl,
      secret: fallbackWebhookSecret,
      events: ["*"],
    });

    const currentSesh = await getWorkspaceSeshState(params.workspaceId);
    await updateWorkspaceSeshState(params.workspaceId, {
      webhooks: {
        ...(currentSesh.webhooks ?? {}),
        whatsapp: {
          id: adminWebhook.webhook?.id ?? null,
          name: adminWebhook.webhook?.name ?? null,
          url: adminWebhookUrl,
          createdAt:
            typeof adminWebhook.webhook?.created_at === "string"
              ? adminWebhook.webhook.created_at
              : new Date().toISOString(),
          events: ["*"],
        },
      },
    });
    webhookReady = true;
  }

  const current = await getWorkspaceSeshState(params.workspaceId);
  const whatsapp: WorkspaceSeshChannelState = {
    ...(current.whatsapp ?? {}),
    provider: "whatsapp",
    providerType: "http-api",
    enabled: true,
    configuredAt,
    configuredByUserId: params.configuredByUserId,
    defaultUserId: params.configuredByUserId,
    defaultRole: params.defaultRole?.trim() || "support",
    endpointToken:
      typeof inboundWebhook.endpoint?.endpoint_token === "string"
        ? inboundWebhook.endpoint.endpoint_token
        : null,
    endpointUrl: inboundWebhook.endpointUrl ?? null,
    verifyToken,
    phoneNumberId: params.phoneNumberId,
    businessAccountId: params.businessAccountId ?? null,
    webhookReady,
    inboundReady: false,
    outboundReady: false,
    readinessWarnings,
    readinessErrors,
    lastError: webhookReady || readinessErrors.length === 0
      ? null
      : "WhatsApp webhook relay is not fully configured.",
  };

  await updateWorkspaceSeshState(params.workspaceId, {
    whatsapp,
  });

  return {
    provider: "whatsapp",
    endpointUrl: inboundWebhook.endpointUrl ?? null,
    endpointToken:
      typeof inboundWebhook.endpoint?.endpoint_token === "string"
        ? inboundWebhook.endpoint.endpoint_token
        : null,
    verifyToken,
    adminWebhookUrl,
  } satisfies WhatsAppConnectionResult;
}

function readMessageText(message: Record<string, unknown>): string {
  if (typeof message.text === "object" && message.text && !Array.isArray(message.text)) {
    const body = (message.text as { body?: unknown }).body;
    if (typeof body === "string" && body.trim()) {
      return body.trim();
    }
  }

  if (typeof message.button === "object" && message.button && !Array.isArray(message.button)) {
    const text = (message.button as { text?: unknown }).text;
    if (typeof text === "string" && text.trim()) {
      return text.trim();
    }
  }

  if (
    typeof message.interactive === "object" &&
    message.interactive &&
    !Array.isArray(message.interactive)
  ) {
    const interactive = message.interactive as {
      button_reply?: { title?: unknown };
      list_reply?: { title?: unknown };
    };
    const title =
      interactive.button_reply?.title ?? interactive.list_reply?.title ?? null;
    if (typeof title === "string" && title.trim()) {
      return title.trim();
    }
  }

  const type = typeof message.type === "string" ? message.type.trim() : "";
  return type ? `[${type}]` : "[message]";
}

export function normalizeWhatsAppWebhookMessages(
  payload: Record<string, unknown>,
): NormalizedWhatsAppMessage[] {
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  const results: NormalizedWhatsAppMessage[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const changes = Array.isArray((entry as { changes?: unknown[] }).changes)
      ? (entry as { changes: unknown[] }).changes
      : [];

    for (const change of changes) {
      if (!change || typeof change !== "object" || Array.isArray(change)) {
        continue;
      }

      const value = (change as { value?: unknown }).value;
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        continue;
      }

      const rawMessages = Array.isArray((value as { messages?: unknown[] }).messages)
        ? (value as { messages: unknown[] }).messages
        : [];
      const contacts = Array.isArray((value as { contacts?: unknown[] }).contacts)
        ? (value as { contacts: unknown[] }).contacts
        : [];

      for (const rawMessage of rawMessages) {
        if (!rawMessage || typeof rawMessage !== "object" || Array.isArray(rawMessage)) {
          continue;
        }

        const message = rawMessage as Record<string, unknown>;
        const from =
          typeof message.from === "string" && message.from.trim()
            ? message.from.trim()
            : null;

        if (!from) {
          continue;
        }

        const contact = contacts.find((candidate) => {
          if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
            return false;
          }
          return (
            typeof (candidate as { wa_id?: unknown }).wa_id === "string" &&
            (candidate as { wa_id: string }).wa_id.trim() === from
          );
        }) as
          | {
              profile?: { name?: unknown };
            }
          | undefined;

        const text = readMessageText(message);
        results.push({
          externalThreadId: from,
          externalUserId: from,
          messageId:
            typeof message.id === "string" && message.id.trim() ? message.id.trim() : null,
          text,
          title: `WhatsApp chat with ${from}`,
          contactName:
            typeof contact?.profile?.name === "string" && contact.profile.name.trim()
              ? contact.profile.name.trim()
              : null,
          receivedAt:
            typeof message.timestamp === "string" && Number.isFinite(Number(message.timestamp))
              ? new Date(Number(message.timestamp) * 1000)
              : null,
        });
      }
    }
  }

  return results;
}

export async function sendWhatsAppMessageViaSesh(params: {
  workspaceId: string;
  to: string;
  text: string;
  replyToMessageId?: string | null;
}) {
  const sesh = await getWorkspaceSeshState(params.workspaceId);
  const phoneNumberId = sesh.whatsapp?.phoneNumberId?.trim();

  if (!phoneNumberId) {
    throw new Error("Workspace WhatsApp channel is missing phoneNumberId");
  }

  try {
    const result = await executeWorkspaceSeshAction<Record<string, unknown>>({
      workspaceId: params.workspaceId,
      provider: "whatsapp",
      action: "request",
      args: [
        {
          method: "POST",
          path: `/${phoneNumberId}/messages`,
          body: {
            messaging_product: "whatsapp",
            to: params.to,
            type: "text",
            text: {
              body: params.text,
            },
            ...(params.replyToMessageId?.trim()
              ? {
                  context: {
                    message_id: params.replyToMessageId.trim(),
                  },
                }
              : {}),
          },
        },
      ],
    });

    const now = new Date().toISOString();
    await updateWorkspaceWhatsAppState(params.workspaceId, {
      outboundReady: true,
      lastOutboundAt: now,
      lastActionAt: now,
      readinessErrors: [],
      lastError: null,
    });

    return result;
  } catch (error: unknown) {
    await updateWorkspaceWhatsAppState(params.workspaceId, {
      lastError:
        error instanceof Error ? error.message : "Failed to send WhatsApp message via Sesh.",
      readinessErrors: [
        error instanceof Error ? error.message : "Failed to send WhatsApp message via Sesh.",
      ],
    });
    throw error;
  }
}

export async function sendWhatsAppReplyForConversationThread(params: {
  conversationThreadId: string;
  text: string;
  replyToMessageId?: string | null;
}) {
  const thread = await prisma.conversationThread.findUnique({
    where: { id: params.conversationThreadId },
    select: {
      id: true,
      channel: true,
      workspaceId: true,
      externalThreadId: true,
    },
  });

  if (!thread) {
    throw new Error("Conversation thread not found");
  }

  if (thread.channel !== "whatsapp") {
    throw new Error("Conversation thread is not a WhatsApp thread");
  }

  if (!thread.workspaceId) {
    throw new Error("WhatsApp thread is missing workspace context");
  }

  const result = await sendWhatsAppMessageViaSesh({
    workspaceId: thread.workspaceId,
    to: thread.externalThreadId,
    text: params.text,
    replyToMessageId: params.replyToMessageId,
  });

  const now = new Date();
  await prisma.conversationThread.update({
    where: { id: thread.id },
    data: {
      lastOutboundAt: now,
      lastMessageAt: now,
    },
  });

  return result;
}

export async function markWorkspaceWhatsAppInboundReceived(params: {
  workspaceId: string;
  receivedAt?: Date | null;
}) {
  const timestamp = (params.receivedAt ?? new Date()).toISOString();
  await updateWorkspaceWhatsAppState(params.workspaceId, {
    webhookReady: true,
    inboundReady: true,
    lastInboundAt: timestamp,
    lastActionAt: timestamp,
    readinessErrors: [],
    lastError: null,
  });
}

export async function markWorkspaceWhatsAppWebhookFailure(params: {
  workspaceId: string;
  error: string;
}) {
  const current = await getWorkspaceSeshState(params.workspaceId);
  const now = new Date().toISOString();

  await updateWorkspaceWhatsAppState(params.workspaceId, {
    webhookReady: Boolean(current.whatsapp?.endpointUrl),
    lastError: params.error,
    readinessErrors: [params.error],
    webhookFailureTimestamps: [
      ...normalizeTimestampList(current.whatsapp?.webhookFailureTimestamps),
      now,
    ],
  });
}

export async function getWorkspaceWhatsAppReadiness(workspaceId: string) {
  const sesh = await getWorkspaceSeshState(workspaceId);
  return evaluateWhatsAppReadiness(sesh);
}

export async function smokeTestWorkspaceWhatsAppOutbound(params: {
  workspaceId: string;
  to: string;
  text: string;
}) {
  const startedAt = Date.now();
  const result = await sendWhatsAppMessageViaSesh({
    workspaceId: params.workspaceId,
    to: params.to,
    text: params.text,
  });
  const readiness = await getWorkspaceWhatsAppReadiness(params.workspaceId);

  return {
    ok: true,
    provider: "whatsapp",
    latencyMs: Date.now() - startedAt,
    workspaceId: params.workspaceId,
    readiness,
    result,
  };
}
