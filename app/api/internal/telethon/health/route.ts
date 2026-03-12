import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { TRANSPORT_PROVIDER } from "@/lib/agent-blueprint";
import { getStatusError } from "@/lib/http-error";

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);

    const [
      telethonAgents,
      telethonIdentities,
      activeBindings,
      pendingOutboundMessages,
      pendingTasks,
      openTickets,
      relationships,
    ] =
      await Promise.all([
        prisma.agent.count({
          where: {
            transportProvider: TRANSPORT_PROVIDER.telethon,
          },
        }),
        prisma.telegramIdentity.count({
          where: {
            transportProvider: TRANSPORT_PROVIDER.telethon,
            status: {
              in: ["pending", "active", "error"],
            },
          },
        }),
        prisma.telegramThreadBinding.count({
          where: {
            status: "active",
          },
        }),
        prisma.outboundTransportMessage.count({
          where: {
            status: {
              in: ["queued", "claimed"],
            },
          },
        }),
        prisma.fleetTask.count({
          where: {
            status: {
              in: ["queued", "running", "needs_approval"],
            },
          },
        }),
        prisma.supportTicket.count({
          where: {
            status: {
              in: ["open", "pending_user", "escalated"],
            },
          },
        }),
        prisma.customerRelationship.count({
          where: { status: "active" },
        }),
      ]);

    return NextResponse.json({
      status: "ok",
      telethonAgents,
      telethonIdentities,
      activeThreadBindings: activeBindings,
      pendingOutboundMessages,
      pendingTasks,
      openTickets,
      activeRelationships: relationships,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Health] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
