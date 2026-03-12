import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPrimaryTelegramIdentityForAgent } from "@/lib/telegram-identities";

export const OUTBOUND_TRANSPORT_MESSAGE_TYPE = {
  sendMessage: "send_message",
  editMessage: "edit_message",
  typing: "typing",
  markRead: "mark_read",
} as const;

export const OUTBOUND_TRANSPORT_MESSAGE_STATUS = {
  queued: "queued",
  claimed: "claimed",
  sent: "sent",
  failed: "failed",
  canceled: "canceled",
} as const;

type OutboundTransportMessageType =
  (typeof OUTBOUND_TRANSPORT_MESSAGE_TYPE)[keyof typeof OUTBOUND_TRANSPORT_MESSAGE_TYPE];
type OutboundTransportMessageStatus =
  (typeof OUTBOUND_TRANSPORT_MESSAGE_STATUS)[keyof typeof OUTBOUND_TRANSPORT_MESSAGE_STATUS];

function nextRetryTime(attempt: number): Date {
  const delaySeconds = Math.min(300, Math.max(15, 15 * 2 ** Math.max(0, attempt - 1)));
  return new Date(Date.now() + delaySeconds * 1000);
}

export async function enqueueOutboundTransportMessage(params: {
  agentId: string;
  telegramIdentityId: string;
  externalChatId: string;
  payload: Record<string, unknown>;
  type?: OutboundTransportMessageType;
  conversationThreadId?: string | null;
  fleetTaskId?: string | null;
  externalMessageId?: string | null;
  maxAttempts?: number;
}) {
  return prisma.outboundTransportMessage.create({
    data: {
      agentId: params.agentId,
      telegramIdentityId: params.telegramIdentityId,
      conversationThreadId: params.conversationThreadId ?? null,
      fleetTaskId: params.fleetTaskId ?? null,
      type: params.type ?? OUTBOUND_TRANSPORT_MESSAGE_TYPE.sendMessage,
      payload: params.payload as Prisma.InputJsonValue,
      externalChatId: params.externalChatId,
      externalMessageId: params.externalMessageId ?? null,
      maxAttempts: params.maxAttempts ?? 5,
    },
    include: {
      telegramIdentity: true,
      agent: {
        select: {
          id: true,
          name: true,
          slug: true,
          ownerType: true,
          agentKind: true,
          status: true,
          cortexId: true,
        },
      },
      conversationThread: true,
      fleetTask: true,
    },
  });
}

export async function claimOutboundTransportMessages(params?: {
  limit?: number;
  claimedBy?: string | null;
  telegramIdentityId?: string | null;
}) {
  const limit = Math.min(Math.max(params?.limit ?? 20, 1), 100);
  const now = new Date();
  const claimedBy = params?.claimedBy?.trim() || "telethon-runner";

  return prisma.$transaction(async (tx) => {
    const candidates = await tx.outboundTransportMessage.findMany({
      where: {
        status: OUTBOUND_TRANSPORT_MESSAGE_STATUS.queued,
        nextRunAt: {
          lte: now,
        },
        telegramIdentityId: params?.telegramIdentityId ?? undefined,
        telegramIdentity: {
          transportProvider: "telethon",
          status: {
            in: ["active", "pending"],
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
      take: limit,
      select: {
        id: true,
      },
    });

    const claimedIds: string[] = [];
    for (const candidate of candidates) {
      const result = await tx.outboundTransportMessage.updateMany({
        where: {
          id: candidate.id,
          status: OUTBOUND_TRANSPORT_MESSAGE_STATUS.queued,
          nextRunAt: {
            lte: now,
          },
        },
        data: {
          status: OUTBOUND_TRANSPORT_MESSAGE_STATUS.claimed,
          claimedAt: now,
          claimedBy,
        },
      });

      if (result.count === 1) {
        claimedIds.push(candidate.id);
      }
    }

    if (claimedIds.length === 0) {
      return [];
    }

    return tx.outboundTransportMessage.findMany({
      where: {
        id: {
          in: claimedIds,
        },
      },
      orderBy: [{ createdAt: "asc" }],
      include: {
        telegramIdentity: true,
        agent: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerType: true,
            agentKind: true,
            status: true,
            cortexId: true,
          },
        },
        conversationThread: true,
        fleetTask: {
          include: {
            ticket: true,
          },
        },
      },
    });
  });
}

async function resolveOutboundTarget(params: {
  agentId: string;
  conversationThreadId?: string | null;
  telegramIdentityId?: string | null;
}) {
  if (params.telegramIdentityId && params.conversationThreadId) {
    const existingBinding = await prisma.telegramThreadBinding.findUnique({
      where: {
        telegramIdentityId_externalChatId: {
          telegramIdentityId: params.telegramIdentityId,
          externalChatId:
            (
              await prisma.conversationThread.findUnique({
                where: { id: params.conversationThreadId },
                select: { externalThreadId: true },
              })
            )?.externalThreadId ?? "",
        },
      },
    });

    if (existingBinding) {
      return {
        telegramIdentityId: existingBinding.telegramIdentityId,
        externalChatId: existingBinding.externalChatId,
      };
    }
  }

  if (params.conversationThreadId) {
    const binding = await prisma.telegramThreadBinding.findFirst({
      where: {
        conversationThreadId: params.conversationThreadId,
        status: "active",
        ...(params.telegramIdentityId
          ? { telegramIdentityId: params.telegramIdentityId }
          : params.agentId
            ? {
                OR: [
                  { agentId: params.agentId },
                  {
                    relationship: {
                      assignedAgentId: params.agentId,
                    },
                  },
                ],
              }
            : undefined),
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        telegramIdentityId: true,
        externalChatId: true,
      },
    });

    if (binding) {
      return binding;
    }
  }

  const [thread, primaryIdentity] = await Promise.all([
    params.conversationThreadId
      ? prisma.conversationThread.findUnique({
          where: { id: params.conversationThreadId },
          select: { externalThreadId: true },
        })
      : Promise.resolve(null),
    params.telegramIdentityId
      ? prisma.telegramIdentity.findUnique({
          where: { id: params.telegramIdentityId },
          select: { id: true },
        })
      : getPrimaryTelegramIdentityForAgent(params.agentId),
  ]);

  let resolvedIdentityId = params.telegramIdentityId ?? null;
  if (!resolvedIdentityId && primaryIdentity) {
    if ("telegramIdentityId" in primaryIdentity) {
      resolvedIdentityId = primaryIdentity.telegramIdentityId;
    } else {
      resolvedIdentityId = primaryIdentity.id;
    }
  }

  if (!resolvedIdentityId || !thread?.externalThreadId) {
    return null;
  }

  return {
    telegramIdentityId: resolvedIdentityId,
    externalChatId: thread.externalThreadId,
  };
}

export async function enqueueOutboundReplyForTask(params: {
  taskId: string;
  responseText: string;
  telegramIdentityId?: string | null;
  externalMessageId?: string | null;
}) {
  const task = await prisma.fleetTask.findUnique({
    where: { id: params.taskId },
    include: {
      assignedAgent: true,
      conversationThread: true,
      ticket: true,
    },
  });

  if (!task) {
    throw { status: 404, message: "Task not found" };
  }

  if (!task.assignedAgentId) {
    throw { status: 400, message: "Task has no assigned agent" };
  }

  if (!task.conversationThreadId || !task.conversationThread) {
    throw { status: 400, message: "Task has no conversation thread" };
  }

  const target = await resolveOutboundTarget({
    agentId: task.assignedAgentId,
    conversationThreadId: task.conversationThreadId,
    telegramIdentityId: params.telegramIdentityId,
  });

  if (!target) {
    throw {
      status: 400,
      message: "No Telegram identity/thread binding available for task",
    };
  }

  return enqueueOutboundTransportMessage({
    agentId: task.assignedAgentId,
    telegramIdentityId: target.telegramIdentityId,
    conversationThreadId: task.conversationThreadId,
    fleetTaskId: task.id,
    externalChatId: target.externalChatId,
    externalMessageId: params.externalMessageId ?? null,
    payload: {
      text: params.responseText,
    },
  });
}

export async function replayOutboundTransportMessage(messageId: string) {
  const message = await prisma.outboundTransportMessage.findUnique({
    where: { id: messageId },
    include: {
      telegramIdentity: true,
      agent: {
        select: {
          id: true,
          name: true,
          slug: true,
          ownerType: true,
          agentKind: true,
          status: true,
          cortexId: true,
        },
      },
      conversationThread: true,
      fleetTask: {
        include: {
          ticket: true,
        },
      },
    },
  });

  if (!message) {
    throw { status: 404, message: "Outbound transport message not found" };
  }

  if (
    message.status === OUTBOUND_TRANSPORT_MESSAGE_STATUS.sent ||
    message.status === OUTBOUND_TRANSPORT_MESSAGE_STATUS.canceled
  ) {
    throw {
      status: 400,
      message: `Cannot replay outbound message with status ${message.status}`,
    };
  }

  return prisma.outboundTransportMessage.update({
    where: { id: message.id },
    data: {
      status: OUTBOUND_TRANSPORT_MESSAGE_STATUS.queued,
      attempts: 0,
      claimedAt: null,
      claimedBy: null,
      nextRunAt: new Date(),
      completedAt: null,
      responseExternalMessageId: null,
      errorCode: null,
      errorMessage: null,
    },
    include: {
      telegramIdentity: true,
      agent: {
        select: {
          id: true,
          name: true,
          slug: true,
          ownerType: true,
          agentKind: true,
          status: true,
          cortexId: true,
        },
      },
      conversationThread: true,
      fleetTask: {
        include: {
          ticket: true,
        },
      },
    },
  });
}

export async function acknowledgeOutboundTransportMessage(params: {
  messageId: string;
  status: "sent" | "failed" | "canceled";
  responseExternalMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  taskStatus?: "running" | "needs_approval" | "completed" | "failed" | "canceled" | null;
  ticketStatus?: "open" | "pending_user" | "escalated" | "resolved" | "closed" | null;
}) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const message = await tx.outboundTransportMessage.findUnique({
      where: { id: params.messageId },
      include: {
        fleetTask: {
          include: {
            ticket: true,
          },
        },
      },
    });

    if (!message) {
      throw { status: 404, message: "Outbound transport message not found" };
    }

    let nextStatus: OutboundTransportMessageStatus = params.status;
    const attempts = message.attempts + (params.status === "failed" ? 1 : 0);
    const exhausted = attempts >= message.maxAttempts;

    if (params.status === "failed" && !exhausted) {
      nextStatus = OUTBOUND_TRANSPORT_MESSAGE_STATUS.queued;
    }

    const updated = await tx.outboundTransportMessage.update({
      where: { id: message.id },
      data: {
        status: nextStatus,
        attempts,
        claimedAt:
          nextStatus === OUTBOUND_TRANSPORT_MESSAGE_STATUS.queued ? null : message.claimedAt ?? now,
        claimedBy:
          nextStatus === OUTBOUND_TRANSPORT_MESSAGE_STATUS.queued ? null : message.claimedBy,
        nextRunAt:
          nextStatus === OUTBOUND_TRANSPORT_MESSAGE_STATUS.queued
            ? nextRetryTime(attempts)
            : message.nextRunAt,
        completedAt:
          params.status === "sent" || params.status === "canceled" || exhausted
            ? now
            : null,
        responseExternalMessageId:
          params.responseExternalMessageId?.trim() || undefined,
        errorCode: params.errorCode?.trim() || undefined,
        errorMessage: params.errorMessage?.trim() || undefined,
      },
      include: {
        fleetTask: {
          include: {
            ticket: true,
          },
        },
      },
    });

    if (params.status === "sent" && message.conversationThreadId) {
      await tx.conversationThread.update({
        where: { id: message.conversationThreadId },
        data: {
          lastOutboundAt: now,
          lastMessageAt: now,
        },
      });

      await tx.telegramThreadBinding.updateMany({
        where: {
          telegramIdentityId: message.telegramIdentityId,
          conversationThreadId: message.conversationThreadId,
          externalChatId: message.externalChatId,
        },
        data: {
          lastOutboundAt: now,
        },
      });
    }

    if (updated.fleetTaskId && params.taskStatus) {
      await tx.fleetTask.update({
        where: { id: updated.fleetTaskId },
        data: {
          status: params.taskStatus,
          startedAt:
            params.taskStatus === "running"
              ? updated.fleetTask?.startedAt ?? now
              : updated.fleetTask?.startedAt,
          completedAt:
            params.taskStatus === "completed" ||
            params.taskStatus === "failed" ||
            params.taskStatus === "canceled"
              ? now
              : updated.fleetTask?.completedAt,
        },
      });
    }

    if (updated.fleetTask?.ticketId && params.ticketStatus) {
      await tx.supportTicket.update({
        where: { id: updated.fleetTask.ticketId },
        data: {
          status: params.ticketStatus,
          resolvedAt: params.ticketStatus === "resolved" ? now : undefined,
        },
      });
    }

    return updated;
  });
}
