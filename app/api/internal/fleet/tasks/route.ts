import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";

const TASK_STATUSES = [
  "queued",
  "running",
  "needs_approval",
  "completed",
  "failed",
  "canceled",
] as const;

const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const { searchParams } = new URL(req.url);
    const fleetId = searchParams.get("fleetId");
    const status = searchParams.get("status");
    const take = Math.min(
      Number.parseInt(searchParams.get("take") ?? "50", 10) || 50,
      200,
    );

    const tasks = await prisma.fleetTask.findMany({
      where: {
        fleetId: fleetId || undefined,
        status: status && TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])
          ? (status as (typeof TASK_STATUSES)[number])
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        fleet: true,
        assignedAgent: {
          select: {
            id: true,
            name: true,
            agentKind: true,
            status: true,
          },
        },
        ticket: true,
        conversationThread: true,
      },
    });

    return NextResponse.json({ tasks });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Fleet/Tasks] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = await req.json();
    const fleetId = String(body.fleetId || "").trim();
    const title = String(body.title || "").trim();
    const type = String(body.type || "").trim();

    if (!fleetId || !title || !type) {
      return NextResponse.json(
        { error: "fleetId, title, and type are required" },
        { status: 400 },
      );
    }

    const nextStatus =
      typeof body.status === "string" &&
      TASK_STATUSES.includes(body.status as (typeof TASK_STATUSES)[number])
        ? (body.status as (typeof TASK_STATUSES)[number])
        : "queued";
    const nextPriority =
      typeof body.priority === "string" &&
      TASK_PRIORITIES.includes(body.priority as (typeof TASK_PRIORITIES)[number])
        ? (body.priority as (typeof TASK_PRIORITIES)[number])
        : "normal";

    const task = await prisma.fleetTask.create({
      data: {
        fleetId,
        type,
        title,
        status: nextStatus,
        priority: nextPriority,
        assignedAgentId:
          typeof body.assignedAgentId === "string" && body.assignedAgentId.length > 0
            ? body.assignedAgentId
            : null,
        requesterUserId:
          typeof body.requesterUserId === "string" && body.requesterUserId.length > 0
            ? body.requesterUserId
            : null,
        ticketId:
          typeof body.ticketId === "string" && body.ticketId.length > 0
            ? body.ticketId
            : null,
        conversationThreadId:
          typeof body.conversationThreadId === "string" &&
          body.conversationThreadId.length > 0
            ? body.conversationThreadId
            : null,
        payload:
          body.payload && typeof body.payload === "object"
            ? body.payload
            : undefined,
      },
      include: {
        fleet: true,
        assignedAgent: true,
        ticket: true,
        conversationThread: true,
      },
    });

    return NextResponse.json({ task });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Fleet/Tasks] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
