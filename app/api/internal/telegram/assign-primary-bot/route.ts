import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import {
  TELEGRAM_PROVISIONING_MODE,
  assignPrimaryTelegramIdentityToAgent,
} from "@/lib/agent-telegram";
import {
  TELEGRAM_IDENTITY_OWNERSHIP,
} from "@/lib/telegram-identities";

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const agentId =
      typeof body.agentId === "string" ? body.agentId.trim() : "";
    const telegramIdentityId =
      typeof body.telegramIdentityId === "string"
        ? body.telegramIdentityId.trim()
        : "";
    const packItemId =
      typeof body.packItemId === "string" ? body.packItemId.trim() : "";

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 },
      );
    }

    if (!telegramIdentityId && !packItemId) {
      return NextResponse.json(
        { error: "telegramIdentityId or packItemId is required" },
        { status: 400 },
      );
    }

    let resolvedIdentityId = telegramIdentityId;
    let packItem:
      | {
          id: string;
          packId: string;
          assignmentStatus: string;
          telegramIdentityId: string;
        }
      | null = null;

    if (!resolvedIdentityId && packItemId) {
      packItem = await prisma.telegramBotPackItem.findUnique({
        where: { id: packItemId },
        select: {
          id: true,
          packId: true,
          assignmentStatus: true,
          telegramIdentityId: true,
        },
      });

      if (!packItem) {
        return NextResponse.json(
          { error: "Telegram bot pack item not found" },
          { status: 404 },
        );
      }

      if (
        packItem.assignmentStatus === "transfer_pending" ||
        packItem.assignmentStatus === "transferred" ||
        packItem.assignmentStatus === "retired"
      ) {
        return NextResponse.json(
          {
            error: `Pack item is not assignable in status ${packItem.assignmentStatus}`,
          },
          { status: 400 },
        );
      }

      resolvedIdentityId = packItem.telegramIdentityId;
    }

    const assigned = await assignPrimaryTelegramIdentityToAgent({
      agentId,
      telegramIdentityId: resolvedIdentityId,
      provisioningMode: TELEGRAM_PROVISIONING_MODE.meetMattManagedBot,
      identityOwnershipType: TELEGRAM_IDENTITY_OWNERSHIP.meetmattManaged,
      metadata: {
        source: "internal-telegram-assign-primary-bot",
        packItemId: packItem?.id ?? null,
        packId: packItem?.packId ?? null,
      },
    });

    if (packItem) {
      const existingPackItem = await prisma.telegramBotPackItem.findUnique({
        where: { id: packItem.id },
        select: { metadata: true },
      });
      await prisma.telegramBotPackItem.update({
        where: { id: packItem.id },
        data: {
          assignmentStatus: "active",
          metadata:
            existingPackItem?.metadata &&
            !Array.isArray(existingPackItem.metadata) &&
            typeof existingPackItem.metadata === "object"
              ? {
                  ...(existingPackItem.metadata as Record<string, unknown>),
                  source: "internal-telegram-assign-primary-bot",
                  assignedAgentId: agentId,
                  assignedAt: new Date().toISOString(),
                }
              : {
                  source: "internal-telegram-assign-primary-bot",
                  assignedAgentId: agentId,
                  assignedAt: new Date().toISOString(),
                },
        },
      });
    }

    return NextResponse.json({
      agent: {
        id: assigned.agent.id,
        name: assigned.agent.name,
        status: assigned.agent.status,
        activationStatus: assigned.agent.activationStatus,
        deployState: assigned.agent.deployState,
        transportProvider: assigned.agent.transportProvider,
        botUsername: assigned.agent.botUsername,
        telegramLink: assigned.agent.telegramLink,
        workspaceId: assigned.agent.workspaceId,
      },
      telegram: assigned.launchState,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json(
        { error: statusError.message },
        { status: statusError.status },
      );
    }

    console.error("[Internal/Telegram/AssignPrimaryBot] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
