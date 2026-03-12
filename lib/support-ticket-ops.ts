import {
  type FleetTaskPriority,
  type TicketStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SUPPORT_TICKET_STATUS_OPTIONS = [
  "open",
  "pending_user",
  "escalated",
  "resolved",
  "closed",
] as const;

export const SUPPORT_TICKET_PRIORITY_OPTIONS = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

type SupportTicketStatusOption = (typeof SUPPORT_TICKET_STATUS_OPTIONS)[number];
type SupportTicketPriorityOption =
  (typeof SUPPORT_TICKET_PRIORITY_OPTIONS)[number];

function isSupportTicketStatus(
  value: string | null | undefined,
): value is SupportTicketStatusOption {
  return SUPPORT_TICKET_STATUS_OPTIONS.includes(
    value as SupportTicketStatusOption,
  );
}

function isSupportTicketPriority(
  value: string | null | undefined,
): value is SupportTicketPriorityOption {
  return SUPPORT_TICKET_PRIORITY_OPTIONS.includes(
    value as SupportTicketPriorityOption,
  );
}

export async function updateSupportTicket(params: {
  ticketId: string;
  status?: string | null;
  priority?: string | null;
  assignedAgentId?: string | null;
}) {
  const ticketId = params.ticketId.trim();

  if (!ticketId) {
    throw { status: 400, message: "ticketId required" };
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      fleetTask: true,
      assignedAgent: true,
      requester: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      relationship: {
        select: {
          id: true,
          role: true,
          slaTier: true,
        },
      },
      conversationThread: {
        select: {
          id: true,
          channel: true,
          externalThreadId: true,
          title: true,
          lastInboundAt: true,
          lastOutboundAt: true,
        },
      },
    },
  });

  if (!ticket) {
    throw { status: 404, message: "Support ticket not found" };
  }

  const nextStatus: TicketStatus = isSupportTicketStatus(params.status)
    ? (params.status as TicketStatus)
    : ticket.status;
  const nextPriority: FleetTaskPriority = isSupportTicketPriority(params.priority)
    ? (params.priority as FleetTaskPriority)
    : ticket.priority;

  let nextAssignedAgentId = ticket.assignedAgentId;
  if (params.assignedAgentId !== undefined) {
    nextAssignedAgentId = params.assignedAgentId?.trim() || null;
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        priority: nextPriority,
        assignedAgentId: nextAssignedAgentId,
        resolvedAt:
          nextStatus === "resolved" || nextStatus === "closed"
            ? ticket.resolvedAt ?? now
            : null,
      },
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
            agentKind: true,
            status: true,
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        relationship: {
          select: {
            id: true,
            role: true,
            slaTier: true,
          },
        },
        conversationThread: {
          select: {
            id: true,
            channel: true,
            externalThreadId: true,
            title: true,
            lastInboundAt: true,
            lastOutboundAt: true,
          },
        },
      },
    });

    if (ticket.fleetTask) {
      await tx.fleetTask.update({
        where: { id: ticket.fleetTask.id },
        data: {
          assignedAgentId: nextAssignedAgentId,
          priority: nextPriority,
        },
      });
    }

    return updated;
  });
}
