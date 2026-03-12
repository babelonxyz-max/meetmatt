import { Prisma, type FleetTaskStatus, type TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueOutboundReplyForTask } from "@/lib/transport-outbound";
import { sendWhatsAppReplyForConversationThread } from "@/lib/whatsapp";

export const DISPATCH_TASK_STATUSES = [
  "running",
  "needs_approval",
  "completed",
  "failed",
  "canceled",
] as const;

export const DISPATCH_TICKET_STATUSES = [
  "open",
  "pending_user",
  "escalated",
  "resolved",
  "closed",
] as const;

type DispatchTaskStatus = (typeof DISPATCH_TASK_STATUSES)[number];
type DispatchTicketStatus = (typeof DISPATCH_TICKET_STATUSES)[number];
type DispatchOutboundMessage = {
  id: string | null;
  [key: string]: unknown;
};

function isDispatchTaskStatus(value: string | null | undefined): value is DispatchTaskStatus {
  return DISPATCH_TASK_STATUSES.includes(value as DispatchTaskStatus);
}

function isDispatchTicketStatus(
  value: string | null | undefined,
): value is DispatchTicketStatus {
  return DISPATCH_TICKET_STATUSES.includes(value as DispatchTicketStatus);
}

export async function dispatchFleetTask(params: {
  taskId: string;
  status?: string | null;
  ticketStatus?: string | null;
  responseText?: string | null;
  enqueueTransport?: boolean;
  telegramIdentityId?: string | null;
  externalMessageId?: string | null;
  conversationThreadId?: string | null;
  result?: Record<string, unknown> | null;
  preserveStatusIfMissing?: boolean;
  touchConversationOnNoTransport?: boolean;
}) {
  const taskId = params.taskId.trim();

  if (!taskId) {
    throw { status: 400, message: "taskId required" };
  }

  const task = await prisma.fleetTask.findUnique({
    where: { id: taskId },
    include: {
      ticket: true,
      conversationThread: {
        select: {
          id: true,
          channel: true,
        },
      },
    },
  });

  if (!task) {
    throw { status: 404, message: "Task not found" };
  }

  const hasExplicitTaskStatus = isDispatchTaskStatus(params.status);
  let nextStatus: FleetTaskStatus;

  if (hasExplicitTaskStatus) {
    nextStatus = params.status as FleetTaskStatus;
  } else if (params.preserveStatusIfMissing) {
    nextStatus = task.status;
  } else {
    nextStatus = "completed";
  }

  const hasExplicitTicketStatus = isDispatchTicketStatus(params.ticketStatus);
  let nextTicketStatus: TicketStatus | undefined;

  if (hasExplicitTicketStatus) {
    nextTicketStatus = params.ticketStatus as TicketStatus;
  } else if (hasExplicitTaskStatus) {
    nextTicketStatus =
      nextStatus === "completed"
        ? "pending_user"
        : nextStatus === "failed"
          ? "escalated"
          : undefined;
  }

  const responseText = params.responseText?.trim() || "";
  const now = new Date();
  const shouldEnqueueTransport =
    responseText.length > 0 && params.enqueueTransport !== false;
  const conversationThreadId =
    params.conversationThreadId?.trim() || task.conversationThreadId;
  const isWhatsAppThread =
    task.conversationThread?.channel === "whatsapp" && Boolean(conversationThreadId);

  const outboundMessage =
    shouldEnqueueTransport && isWhatsAppThread && conversationThreadId
      ? await sendWhatsAppReplyForConversationThread({
          conversationThreadId,
          text: responseText,
          replyToMessageId: params.externalMessageId?.trim() || null,
        })
      : null;

  const updatedTask = await prisma.fleetTask.update({
    where: { id: taskId },
    data: {
      status: nextStatus,
      startedAt:
        nextStatus === "running" || task.startedAt ? task.startedAt ?? now : null,
      completedAt:
        nextStatus === "completed" ||
        nextStatus === "failed" ||
        nextStatus === "canceled"
          ? now
          : null,
      result:
        params.result && typeof params.result === "object"
          ? (params.result as Prisma.InputJsonValue)
          : responseText
            ? ({ responseText } as Prisma.InputJsonValue)
            : undefined,
    },
    include: {
      ticket: true,
    },
  });

  if (task.ticketId && nextTicketStatus) {
    await prisma.supportTicket.update({
      where: { id: task.ticketId },
      data: {
        status: nextTicketStatus,
        resolvedAt:
          nextStatus === "completed" && nextTicketStatus === "resolved"
            ? now
            : undefined,
      },
    });
  }

  if (
    conversationThreadId &&
    !shouldEnqueueTransport &&
    params.touchConversationOnNoTransport !== false
  ) {
    await prisma.conversationThread.update({
      where: { id: conversationThreadId },
      data: {
        lastOutboundAt: now,
        lastMessageAt: now,
      },
    });
  }

  const queuedOutboundMessage = shouldEnqueueTransport && !isWhatsAppThread
    ? await enqueueOutboundReplyForTask({
        taskId: task.id,
        responseText,
        telegramIdentityId: params.telegramIdentityId?.trim() || null,
        externalMessageId: params.externalMessageId?.trim() || null,
      })
    : null;

  const normalizedOutboundMessage: DispatchOutboundMessage | null = outboundMessage
    ? {
        id: null,
        provider: "whatsapp",
        payload: outboundMessage,
      }
    : queuedOutboundMessage
      ? (queuedOutboundMessage as DispatchOutboundMessage)
      : null;

  return {
    ok: true,
    task: updatedTask,
    outboundMessage: normalizedOutboundMessage,
  };
}
