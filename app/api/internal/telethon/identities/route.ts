import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import {
  listTelethonIdentities,
  provisionTelegramIdentity,
  readTelegramIdentitySecrets,
  upsertTelegramThreadBinding,
} from "@/lib/telegram-identities";
import { TRANSPORT_PROVIDER } from "@/lib/agent-blueprint";

export async function GET(req: NextRequest) {
  try {
    const authMode = requireAdminOrInternal(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const includeInactive = searchParams.get("includeInactive") === "true";
    const includeSecrets =
      authMode === "internal" && searchParams.get("includeSecrets") === "true";
    const agentId = searchParams.get("agentId");
    const userId = searchParams.get("userId");
    const workspaceId = searchParams.get("workspaceId");

    const identities = await listTelethonIdentities({
      status:
        status === "pending" ||
        status === "active" ||
        status === "suspended" ||
        status === "revoked" ||
        status === "error"
          ? status
          : null,
      includeInactive,
    });

    const filtered = identities.filter((identity) => {
      if (agentId && !identity.agentLinks.some((link) => link.agentId === agentId)) {
        return false;
      }
      if (userId && identity.userId !== userId) {
        return false;
      }
      if (workspaceId && identity.workspaceId !== workspaceId) {
        return false;
      }
      return true;
    });

    return NextResponse.json({
      identities: filtered.map((identity) => ({
        ...identity,
        botToken: includeSecrets
          ? readTelegramIdentitySecrets(identity).botToken
          : undefined,
        session: includeSecrets
          ? readTelegramIdentitySecrets(identity).session
          : undefined,
        botTokenEncrypted: undefined,
        sessionEncrypted: undefined,
      })),
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Identities] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;

    const links = Array.isArray(body.links)
      ? body.links
          .map((link) => {
            if (!link || typeof link !== "object") {
              return null;
            }
            const agentId =
              typeof link.agentId === "string" ? link.agentId.trim() : "";
            if (!agentId) {
              return null;
            }
            return {
              agentId,
              role:
                typeof link.role === "string" && link.role.trim().length > 0
                  ? link.role.trim()
                  : null,
            };
          })
          .filter((link): link is { agentId: string; role: string | null } => !!link)
      : typeof body.agentId === "string" && body.agentId.trim().length > 0
        ? [{ agentId: body.agentId.trim(), role: "primary" }]
        : [];

    const identity = await provisionTelegramIdentity({
      kind: typeof body.kind === "string" ? body.kind : null,
      transportProvider: TRANSPORT_PROVIDER.telethon,
      ownershipType:
        typeof body.ownershipType === "string" ? body.ownershipType : null,
      status: typeof body.status === "string" ? body.status : null,
      userId: typeof body.userId === "string" ? body.userId.trim() : null,
      workspaceId:
        typeof body.workspaceId === "string" ? body.workspaceId.trim() : null,
      displayName:
        typeof body.displayName === "string" ? body.displayName : null,
      externalTelegramUserId:
        typeof body.externalTelegramUserId === "string"
          ? body.externalTelegramUserId
          : null,
      externalTelegramUsername:
        typeof body.externalTelegramUsername === "string"
          ? body.externalTelegramUsername
          : null,
      externalPhone:
        typeof body.externalPhone === "string" ? body.externalPhone : null,
      botToken: typeof body.botToken === "string" ? body.botToken : null,
      session: typeof body.session === "string" ? body.session : null,
      runtimeLabel:
        typeof body.runtimeLabel === "string" ? body.runtimeLabel : null,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Prisma.InputJsonValue)
          : undefined,
      links,
    });

    const threadBindings = Array.isArray(body.threadBindings)
      ? (
          await Promise.all(
            body.threadBindings.map(async (binding) => {
              if (!binding || typeof binding !== "object") {
                return null;
              }
              const externalChatId =
                typeof binding.externalChatId === "string"
                  ? binding.externalChatId.trim()
                  : "";
              if (!externalChatId) {
                return null;
              }
              return upsertTelegramThreadBinding({
                telegramIdentityId: identity.id,
                externalChatId,
                externalPeerId:
                  typeof binding.externalPeerId === "string"
                    ? binding.externalPeerId
                    : null,
                userId:
                  typeof binding.userId === "string"
                    ? binding.userId
                    : identity.userId,
                workspaceId:
                  typeof binding.workspaceId === "string"
                    ? binding.workspaceId
                    : identity.workspaceId,
                agentId:
                  typeof binding.agentId === "string"
                    ? binding.agentId
                    : identity.agentLinks[0]?.agentId ?? null,
                relationshipId:
                  typeof binding.relationshipId === "string"
                    ? binding.relationshipId
                    : null,
                conversationThreadId:
                  typeof binding.conversationThreadId === "string"
                    ? binding.conversationThreadId
                    : null,
                bindingType:
                  typeof binding.bindingType === "string"
                    ? binding.bindingType
                    : null,
                metadata:
                  binding.metadata && typeof binding.metadata === "object"
                    ? (binding.metadata as Prisma.InputJsonValue)
                    : undefined,
              });
            }),
          )
        ).filter(Boolean)
      : [];

    return NextResponse.json({
      identity,
      threadBindings,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Identities] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
