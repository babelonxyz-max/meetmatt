"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getErrorMessage } from "@/lib/http-error";
import { requireOpsSession } from "@/lib/ops-auth";
import { processDeployJobs } from "@/lib/deploy-jobs";
import { dispatchFleetTask } from "@/lib/fleet-dispatch";
import {
  ensureMattRelationshipPack,
  queueInboundRelationshipTask,
} from "@/lib/matt-relationships";
import { validateWorkspaceComposioReadiness } from "@/lib/composio";
import { smokeTestMattConnectorAction } from "@/lib/matt-connectors";
import {
  provisionTelegramIdentity,
  recordTelegramIdentityHeartbeat,
  upsertTelegramThreadBinding,
} from "@/lib/telegram-identities";
import {
  acknowledgeOutboundTransportMessage,
  claimOutboundTransportMessages,
  replayOutboundTransportMessage,
} from "@/lib/transport-outbound";
import { updateSupportTicket } from "@/lib/support-ticket-ops";
import { smokeTestWorkspaceWhatsAppOutbound } from "@/lib/whatsapp";

function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getRelationshipRole(formData: FormData) {
  return getStringValue(formData, "role") === "account_manager"
    ? "account_manager"
    : "support";
}

function getTelegramIdentityKind(formData: FormData) {
  return getStringValue(formData, "kind") === "bot" ? "bot" : "user_agent";
}

function getTelegramIdentityOwnership(formData: FormData) {
  return getStringValue(formData, "ownershipType") === "customer_owned"
    ? "customer_owned"
    : "meetmatt_managed";
}

function getTelegramIdentityStatus(formData: FormData) {
  const status = getStringValue(formData, "status");

  if (
    status === "active" ||
    status === "pending" ||
    status === "suspended" ||
    status === "revoked" ||
    status === "error"
  ) {
    return status;
  }

  return "pending";
}

function getBooleanValue(formData: FormData, key: string, fallback = false) {
  const value = getStringValue(formData, key);

  if (!value) {
    return fallback;
  }

  return value === "true" || value === "1" || value === "on";
}

function getBoundedInteger(
  formData: FormData,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const raw = getStringValue(formData, key);
  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function parseJsonText(
  value: string,
  fallback: Record<string, unknown> | unknown[] | null = null,
) {
  if (!value.trim()) {
    return fallback;
  }

  return JSON.parse(value);
}

export async function seedMattRelationshipPackAction(formData: FormData) {
  await requireOpsSession("/ops");
  const userId = getStringValue(formData, "userId");

  if (!userId) {
    redirect("/ops?error=seed-user-id");
  }

  try {
    await ensureMattRelationshipPack({ userId });
  } catch (error) {
    console.error("[Ops] Failed to seed Matt relationship pack:", error);
    redirect(`/ops?error=seed-failed&userId=${encodeURIComponent(userId)}`);
  }

  revalidatePath("/ops");
  redirect(`/ops?notice=relationship-seeded&userId=${encodeURIComponent(userId)}`);
}

export async function processDeployJobsAction(formData: FormData) {
  await requireOpsSession("/ops");
  const rawLimit = getStringValue(formData, "limit");
  const parsedLimit = Number.parseInt(rawLimit, 10);
  const limit = Number.isNaN(parsedLimit)
    ? 10
    : Math.min(Math.max(parsedLimit, 1), 50);

  try {
    const result = await processDeployJobs(limit);
    revalidatePath("/ops");
    redirect(
      `/ops?notice=deploy-processed&processed=${result.processed}&completed=${result.completed}&retried=${result.retried}&failed=${result.failed}`,
    );
  } catch (error) {
    console.error("[Ops] Failed to process deploy jobs:", error);
    redirect("/ops?error=deploy-process-failed");
  }
}

export async function replayOutboundTransportMessageAction(formData: FormData) {
  await requireOpsSession("/ops");
  const messageId = getStringValue(formData, "messageId");

  if (!messageId) {
    redirect("/ops?error=outbound-message-id");
  }

  try {
    await replayOutboundTransportMessage(messageId);
  } catch (error) {
    console.error("[Ops] Failed to replay outbound transport message:", error);
    redirect(
      `/ops?error=outbound-replay-failed&messageId=${encodeURIComponent(messageId)}`,
    );
  }

  revalidatePath("/ops");
  redirect(
    `/ops?notice=outbound-replayed&messageId=${encodeURIComponent(messageId)}`,
  );
}

export async function queueInboundRelationshipTaskAction(formData: FormData) {
  await requireOpsSession("/ops");
  const userId = getStringValue(formData, "userId");
  const telegramIdentityId = getStringValue(formData, "telegramIdentityId");
  const externalThreadId = getStringValue(formData, "externalThreadId");
  const externalUserId = getStringValue(formData, "externalUserId");
  const text = getStringValue(formData, "text");
  const role = getRelationshipRole(formData);

  if (!userId || !telegramIdentityId || !externalThreadId || !text) {
    redirect("/ops?error=thread-bind-required");
  }

  try {
    const result = await queueInboundRelationshipTask({
      userId,
      telegramIdentityId,
      externalThreadId,
      externalUserId: externalUserId || null,
      text,
      role,
      channel: "telegram",
    });

    revalidatePath("/ops");
    redirect(
      `/ops?notice=thread-bound&userId=${encodeURIComponent(userId)}&externalThreadId=${encodeURIComponent(externalThreadId)}&threadId=${encodeURIComponent(result.thread.id)}`,
    );
  } catch (error) {
    console.error("[Ops] Failed to create Matt thread binding:", error);
    redirect(
      `/ops?error=thread-bind-failed&userId=${encodeURIComponent(userId)}&externalThreadId=${encodeURIComponent(externalThreadId)}`,
    );
  }
}

export async function provisionTelethonIdentityAction(formData: FormData) {
  await requireOpsSession("/ops");
  const kind = getTelegramIdentityKind(formData);
  const ownershipType = getTelegramIdentityOwnership(formData);
  const status = getTelegramIdentityStatus(formData);
  const displayName = getStringValue(formData, "displayName");
  const externalTelegramUsername = getStringValue(
    formData,
    "externalTelegramUsername",
  );
  const externalTelegramUserId = getStringValue(
    formData,
    "externalTelegramUserId",
  );
  const externalPhone = getStringValue(formData, "externalPhone");
  const runtimeLabel = getStringValue(formData, "runtimeLabel");
  const userId = getStringValue(formData, "userId");
  const linkedAgentId = getStringValue(formData, "linkedAgentId");
  const session = getStringValue(formData, "session");
  const botToken = getStringValue(formData, "botToken");

  if (
    !displayName &&
    !externalTelegramUsername &&
    !externalPhone &&
    !externalTelegramUserId
  ) {
    redirect("/ops?error=identity-label-required");
  }

  if (kind === "bot" && !botToken) {
    redirect("/ops?error=identity-bot-token");
  }

  if (status === "active") {
    const hasRuntimeCredential = kind === "bot" ? Boolean(botToken) : Boolean(session);

    if (!hasRuntimeCredential) {
      redirect("/ops?error=identity-active-credentials");
    }
  }

  try {
    const identity = await provisionTelegramIdentity({
      kind,
      ownershipType,
      status,
      userId: userId || null,
      displayName: displayName || null,
      externalTelegramUsername: externalTelegramUsername || null,
      externalTelegramUserId: externalTelegramUserId || null,
      externalPhone: externalPhone || null,
      runtimeLabel: runtimeLabel || null,
      session: session || null,
      botToken: botToken || null,
      metadata: {
        source: "ops-console",
      },
      links: linkedAgentId
        ? [
            {
              agentId: linkedAgentId,
              role: "primary",
            },
          ]
        : [],
    });

    revalidatePath("/ops");
    redirect(
      `/ops?notice=identity-provisioned&identityId=${encodeURIComponent(identity.id)}`,
    );
  } catch (error) {
    console.error("[Ops] Failed to provision Telethon identity:", error);
    redirect("/ops?error=identity-provision-failed");
  }
}

export async function dispatchFleetTaskAction(formData: FormData) {
  await requireOpsSession("/ops");
  const taskId = getStringValue(formData, "taskId");
  const status = getStringValue(formData, "status");
  const ticketStatus = getStringValue(formData, "ticketStatus");
  const responseText = getStringValue(formData, "responseText");
  const enqueueTransport = getBooleanValue(formData, "enqueueTransport", false);

  if (!taskId) {
    redirect("/ops?error=task-id-required");
  }

  try {
    const result = await dispatchFleetTask({
      taskId,
      status: status || null,
      ticketStatus: ticketStatus || null,
      responseText,
      enqueueTransport,
      preserveStatusIfMissing: true,
      touchConversationOnNoTransport: false,
    });

    revalidatePath("/ops");
    const outboundMessageId =
      typeof result.outboundMessage?.id === "string"
        ? result.outboundMessage.id
        : null;
    redirect(
      `/ops?notice=task-updated&taskId=${encodeURIComponent(taskId)}&status=${encodeURIComponent(result.task.status)}${outboundMessageId ? `&messageId=${encodeURIComponent(outboundMessageId)}` : ""}`,
    );
  } catch (error) {
    const message = getErrorMessage(error, "Failed to update task");
    console.error("[Ops] Failed to update fleet task:", error);
    redirect(
      `/ops?error=task-update-failed&taskId=${encodeURIComponent(taskId)}&message=${encodeURIComponent(message)}`,
    );
  }
}

export async function updateSupportTicketAction(formData: FormData) {
  await requireOpsSession("/ops");
  const ticketId = getStringValue(formData, "ticketId");
  const status = getStringValue(formData, "status");
  const priority = getStringValue(formData, "priority");
  const assignedAgentIdRaw = getStringValue(formData, "assignedAgentId");
  const assignedAgentId =
    assignedAgentIdRaw === "__none__"
      ? null
      : assignedAgentIdRaw.length > 0
        ? assignedAgentIdRaw
        : undefined;

  if (!ticketId) {
    redirect("/ops?error=ticket-id-required");
  }

  try {
    const ticket = await updateSupportTicket({
      ticketId,
      status: status || null,
      priority: priority || null,
      assignedAgentId,
    });

    revalidatePath("/ops");
    redirect(
      `/ops?notice=ticket-updated&ticketId=${encodeURIComponent(ticketId)}&status=${encodeURIComponent(ticket.status)}`,
    );
  } catch (error) {
    const message = getErrorMessage(error, "Failed to update ticket");
    console.error("[Ops] Failed to update support ticket:", error);
    redirect(
      `/ops?error=ticket-update-failed&ticketId=${encodeURIComponent(ticketId)}&message=${encodeURIComponent(message)}`,
    );
  }
}

export async function sendTelethonHeartbeatAction(formData: FormData) {
  await requireOpsSession("/ops");
  const telegramIdentityId = getStringValue(formData, "telegramIdentityId");
  const connected = getStringValue(formData, "connected") !== "false";
  const runner = getStringValue(formData, "runner") || "ops-console";

  if (!telegramIdentityId) {
    redirect("/ops?error=heartbeat-identity-required");
  }

  try {
    const identity = await recordTelegramIdentityHeartbeat({
      telegramIdentityId,
      connected,
      metadata: {
        source: "ops-console",
        runner,
        simulated: true,
        authorized: connected,
      },
    });

    revalidatePath("/ops");
    redirect(
      `/ops?notice=heartbeat-sent&identityId=${encodeURIComponent(identity.id)}&connected=${connected ? "true" : "false"}`,
    );
  } catch (error) {
    const message = getErrorMessage(error, "Failed to send heartbeat");
    console.error("[Ops] Failed to send Telethon heartbeat:", error);
    redirect(
      `/ops?error=heartbeat-failed&identityId=${encodeURIComponent(telegramIdentityId)}&message=${encodeURIComponent(message)}`,
    );
  }
}

export async function claimTelethonOutboundAction(formData: FormData) {
  await requireOpsSession("/ops");
  const telegramIdentityId = getStringValue(formData, "telegramIdentityId");
  const claimedBy = getStringValue(formData, "claimedBy") || "ops-console";
  const limit = getBoundedInteger(formData, "limit", 10, 1, 50);

  try {
    const messages = await claimOutboundTransportMessages({
      limit,
      claimedBy,
      telegramIdentityId: telegramIdentityId || null,
    });

    revalidatePath("/ops");
    redirect(
      `/ops?notice=outbound-claimed&count=${messages.length}&identityId=${encodeURIComponent(telegramIdentityId || "all")}`,
    );
  } catch (error) {
    const message = getErrorMessage(error, "Failed to claim outbound work");
    console.error("[Ops] Failed to claim Telethon outbound work:", error);
    redirect(
      `/ops?error=outbound-claim-failed&message=${encodeURIComponent(message)}`,
    );
  }
}

export async function upsertTelegramThreadBindingAction(formData: FormData) {
  await requireOpsSession("/ops");
  const telegramIdentityId = getStringValue(formData, "telegramIdentityId");
  const externalChatId = getStringValue(formData, "externalChatId");
  const externalPeerId = getStringValue(formData, "externalPeerId");
  const userId = getStringValue(formData, "userId");
  const agentId = getStringValue(formData, "agentId");
  const relationshipId = getStringValue(formData, "relationshipId");
  const conversationThreadId = getStringValue(formData, "conversationThreadId");
  const bindingType = getStringValue(formData, "bindingType");
  const touchInbound = getBooleanValue(formData, "touchInbound", false);
  const touchOutbound = getBooleanValue(formData, "touchOutbound", false);

  if (!telegramIdentityId || !externalChatId) {
    redirect("/ops?error=binding-required");
  }

  try {
    const binding = await upsertTelegramThreadBinding({
      telegramIdentityId,
      externalChatId,
      externalPeerId: externalPeerId || null,
      userId: userId || null,
      agentId: agentId || null,
      relationshipId: relationshipId || null,
      conversationThreadId: conversationThreadId || null,
      bindingType: bindingType || null,
      metadata: {
        source: "ops-console",
      },
      touchInbound,
      touchOutbound,
    });

    revalidatePath("/ops");
    redirect(
      `/ops?notice=binding-upserted&bindingId=${encodeURIComponent(binding.id)}`,
    );
  } catch (error) {
    const message = getErrorMessage(error, "Failed to upsert thread binding");
    console.error("[Ops] Failed to upsert Telegram thread binding:", error);
    redirect(
      `/ops?error=binding-failed&message=${encodeURIComponent(message)}`,
    );
  }
}

export async function acknowledgeOutboundTransportMessageAction(
  formData: FormData,
) {
  await requireOpsSession("/ops");
  const messageId = getStringValue(formData, "messageId");
  const status = getStringValue(formData, "status");
  const responseExternalMessageId = getStringValue(
    formData,
    "responseExternalMessageId",
  );
  const errorCode = getStringValue(formData, "errorCode");
  const errorMessage = getStringValue(formData, "errorMessage");
  const taskStatus = getStringValue(formData, "taskStatus");
  const ticketStatus = getStringValue(formData, "ticketStatus");

  if (!messageId || !status) {
    redirect("/ops?error=outbound-ack-required");
  }

  try {
    const message = await acknowledgeOutboundTransportMessage({
      messageId,
      status:
        status === "sent" || status === "failed" || status === "canceled"
          ? status
          : "sent",
      responseExternalMessageId: responseExternalMessageId || null,
      errorCode: errorCode || null,
      errorMessage: errorMessage || null,
      taskStatus:
        taskStatus === "running" ||
        taskStatus === "needs_approval" ||
        taskStatus === "completed" ||
        taskStatus === "failed" ||
        taskStatus === "canceled"
          ? taskStatus
          : null,
      ticketStatus:
        ticketStatus === "open" ||
        ticketStatus === "pending_user" ||
        ticketStatus === "escalated" ||
        ticketStatus === "resolved" ||
        ticketStatus === "closed"
          ? ticketStatus
          : null,
    });

    revalidatePath("/ops");
    redirect(
      `/ops?notice=outbound-acked&messageId=${encodeURIComponent(message.id)}&status=${encodeURIComponent(message.status)}`,
    );
  } catch (error) {
    const message = getErrorMessage(error, "Failed to acknowledge outbound");
    console.error("[Ops] Failed to acknowledge outbound transport message:", error);
    redirect(
      `/ops?error=outbound-ack-failed&messageId=${encodeURIComponent(messageId)}&message=${encodeURIComponent(message)}`,
    );
  }
}

export async function validateWorkspaceComposioAction(formData: FormData) {
  await requireOpsSession("/ops");
  const workspaceId = getStringValue(formData, "workspaceId");
  const smokeTestToolSlug = getStringValue(formData, "smokeTestToolSlug");
  const toolkitsRaw = getStringValue(formData, "toolkits");
  const toolsRaw = getStringValue(formData, "tools");
  const connectedAccountIdsRaw = getStringValue(formData, "connectedAccountIds");
  const smokeTestInputRaw = getStringValue(formData, "smokeTestInput");

  if (!workspaceId) {
    redirect("/ops?error=composio-validate-required");
  }

  try {
    await validateWorkspaceComposioReadiness({
      workspaceId,
      toolkits: toolkitsRaw
        ? toolkitsRaw
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
      tools: toolsRaw
        ? toolsRaw
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
      connectedAccountIds: connectedAccountIdsRaw
        ? connectedAccountIdsRaw
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
      smokeTestToolSlug: smokeTestToolSlug || null,
      smokeTestInput:
        (parseJsonText(smokeTestInputRaw, {}) as Record<string, unknown> | null) ?? undefined,
    });

    revalidatePath("/ops");
    redirect(
      `/ops?notice=composio-validated&workspaceId=${encodeURIComponent(workspaceId)}`,
    );
  } catch (error) {
    const message = getErrorMessage(error, "Failed to validate Composio workspace");
    console.error("[Ops] Failed to validate Composio workspace:", error);
    redirect(
      `/ops?error=composio-validate-failed&workspaceId=${encodeURIComponent(workspaceId)}&message=${encodeURIComponent(message)}`,
    );
  }
}

export async function smokeTestMattConnectorActionAction(formData: FormData) {
  await requireOpsSession("/ops");
  const workspaceId = getStringValue(formData, "workspaceId");
  const composioToolSlug = getStringValue(formData, "composioToolSlug");
  const composioToolkitsRaw = getStringValue(formData, "composioToolkits");
  const composioInputRaw = getStringValue(formData, "composioInput");
  const fallbackProvider = getStringValue(formData, "fallbackProvider");
  const fallbackAction = getStringValue(formData, "fallbackAction");
  const fallbackArgsRaw = getStringValue(formData, "fallbackArgs");

  if (!workspaceId || !composioToolSlug) {
    redirect("/ops?error=connector-smoke-required");
  }

  try {
    const result = await smokeTestMattConnectorAction({
      workspaceId,
      composioToolSlug,
      composioToolkits: composioToolkitsRaw
        ? composioToolkitsRaw
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
      composioInput:
        (parseJsonText(composioInputRaw, {}) as Record<string, unknown> | null) ?? {},
      fallbackProvider: fallbackProvider || null,
      fallbackAction: fallbackAction || null,
      fallbackArgs:
        (parseJsonText(fallbackArgsRaw, []) as unknown[] | null) ?? undefined,
      allowSeshFallback: true,
    });

    revalidatePath("/ops");
    redirect(
      `/ops?notice=connector-smoke-tested&workspaceId=${encodeURIComponent(workspaceId)}&status=${encodeURIComponent(result.status)}&provider=${encodeURIComponent(result.providerUsed)}`,
    );
  } catch (error) {
    const message = getErrorMessage(error, "Failed to run connector smoke test");
    console.error("[Ops] Failed to run connector smoke test:", error);
    redirect(
      `/ops?error=connector-smoke-failed&workspaceId=${encodeURIComponent(workspaceId)}&message=${encodeURIComponent(message)}`,
    );
  }
}

export async function smokeTestWhatsAppAction(formData: FormData) {
  await requireOpsSession("/ops");
  const workspaceId = getStringValue(formData, "workspaceId");
  const to = getStringValue(formData, "to");
  const text = getStringValue(formData, "text");

  if (!workspaceId || !to || !text) {
    redirect("/ops?error=whatsapp-smoke-required");
  }

  try {
    await smokeTestWorkspaceWhatsAppOutbound({
      workspaceId,
      to,
      text,
    });

    revalidatePath("/ops");
    redirect(
      `/ops?notice=whatsapp-smoke-tested&workspaceId=${encodeURIComponent(workspaceId)}`,
    );
  } catch (error) {
    const message = getErrorMessage(error, "Failed to run WhatsApp smoke test");
    console.error("[Ops] Failed to run WhatsApp smoke test:", error);
    redirect(
      `/ops?error=whatsapp-smoke-failed&workspaceId=${encodeURIComponent(workspaceId)}&message=${encodeURIComponent(message)}`,
    );
  }
}
