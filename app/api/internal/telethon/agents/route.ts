import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { sanitizeAgentName, sanitizeText } from "@/lib/sanitize";
import {
  AGENT_KIND,
  BRAIN_PROVIDER,
  OWNER_TYPE,
  TRANSPORT_PROVIDER,
  deriveAgentBlueprint,
} from "@/lib/agent-blueprint";
import { provisionAgentUseCaseBundle } from "@/lib/capability-commerce/provisioning";
import { provisionTelegramIdentity } from "@/lib/telegram-identities";
import { ensurePersonalWorkspaceForUser, resolveWorkspaceAccessForUser } from "@/lib/workspaces";

export async function GET(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const workspaceId = searchParams.get("workspaceId");
    const ownerType = searchParams.get("ownerType");
    const take = Math.min(
      Number.parseInt(searchParams.get("take") ?? "50", 10) || 50,
      200,
    );

    const agents = await prisma.agent.findMany({
      where: {
        transportProvider: TRANSPORT_PROVIDER.telethon,
        userId: userId || undefined,
        workspaceId: workspaceId || undefined,
        ownerType:
          ownerType === OWNER_TYPE.mattInternal ? OWNER_TYPE.mattInternal : ownerType === OWNER_TYPE.customer ? OWNER_TYPE.customer : undefined,
      },
      orderBy: [{ createdAt: "desc" }],
      take,
      include: {
        telegramIdentities: {
          include: {
            telegramIdentity: true,
          },
        },
      },
    });

    return NextResponse.json({ agents });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Agents] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const rawName = typeof body.agentName === "string" ? body.agentName : "";
    const rawPurpose = typeof body.purpose === "string" ? body.purpose : "";
    const ownerType =
      body.ownerType === OWNER_TYPE.mattInternal
        ? OWNER_TYPE.mattInternal
        : OWNER_TYPE.customer;
    const userId =
      typeof body.userId === "string" && body.userId.trim().length > 0
        ? body.userId.trim()
        : null;
    const requestedWorkspaceId =
      typeof body.workspaceId === "string" && body.workspaceId.trim().length > 0
        ? body.workspaceId.trim()
        : null;

    if (!rawName || !rawPurpose) {
      return NextResponse.json(
        { error: "agentName and purpose are required" },
        { status: 400 },
      );
    }

    const workspaceId =
      ownerType === OWNER_TYPE.customer && userId
        ? (
            await (
              requestedWorkspaceId
                ? resolveWorkspaceAccessForUser({
                    userId,
                    requestedWorkspaceId,
                  })
                : ensurePersonalWorkspaceForUser(userId)
            )
          ).workspaceId
        : requestedWorkspaceId;

    if (ownerType === OWNER_TYPE.customer && !userId) {
      return NextResponse.json(
        { error: "userId is required for customer-owned Telethon agents" },
        { status: 400 },
      );
    }

    const agentName = sanitizeAgentName(rawName);
    const purpose = sanitizeText(rawPurpose, 500);
    if (!agentName || !purpose) {
      return NextResponse.json(
        { error: "agentName and purpose are required" },
        { status: 400 },
      );
    }

    const agentKind =
      typeof body.agentKind === "string" && body.agentKind.trim().length > 0
        ? body.agentKind.trim()
        : ownerType === OWNER_TYPE.mattInternal
          ? AGENT_KIND.mattSupport
          : AGENT_KIND.syntheticEmployee;

    const blueprint = deriveAgentBlueprint({
      ownerType,
      agentKind,
      productUseCase:
        body.productUseCase === "fleet" ? "fleet" : "assistant",
      personalityPreset:
        typeof body.personalityPreset === "string"
          ? body.personalityPreset
          : "professional",
      transportProvider: TRANSPORT_PROVIDER.telethon,
      brainProvider:
        typeof body.brainProvider === "string"
          ? body.brainProvider
          : ownerType === OWNER_TYPE.mattInternal
            ? BRAIN_PROVIDER.cortex
            : BRAIN_PROVIDER.cortex,
      deploymentProvider:
        typeof body.deploymentProvider === "string"
          ? body.deploymentProvider
          : BRAIN_PROVIDER.openclaw,
      cortexId: typeof body.cortexId === "string" ? body.cortexId : null,
    });

    const baseSlug = agentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const sessionId = `tele_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const agent = await prisma.agent.create({
      data: {
        sessionId,
        slug,
        name: agentName,
        purpose,
        features: [],
        tier:
          typeof body.tier === "string" && body.tier.trim().length > 0
            ? body.tier.trim()
            : ownerType === OWNER_TYPE.mattInternal
              ? "matt-internal"
              : "matt-beta",
        status:
          typeof body.status === "string" && body.status.trim().length > 0
            ? body.status.trim()
            : "pending",
        userId,
        workspaceId,
        ownerType: blueprint.ownerType,
        agentKind: blueprint.agentKind,
        productUseCase: blueprint.productUseCase,
        personalityPreset: blueprint.personalityPreset,
        transportProvider: blueprint.transportProvider,
        brainProvider: blueprint.brainProvider,
        deploymentProvider: blueprint.deploymentProvider,
        cortexId: blueprint.cortexId,
        activationStatus:
          typeof body.activationStatus === "string" &&
          body.activationStatus.trim().length > 0
            ? body.activationStatus.trim()
            : "pending",
        deployState: "queued",
      },
      include: {
        telegramIdentities: {
          include: {
            telegramIdentity: true,
          },
        },
      },
    });

    await provisionAgentUseCaseBundle({
      agentId: agent.id,
      useCaseTemplateSlug:
        typeof body.useCaseSlug === "string" && body.useCaseSlug.trim().length > 0
          ? body.useCaseSlug.trim()
          : null,
    });

    const createIdentity =
      body.createIdentity && typeof body.createIdentity === "object"
        ? (body.createIdentity as Record<string, unknown>)
        : null;

    const identity = createIdentity
      ? await provisionTelegramIdentity({
          kind:
            typeof createIdentity.kind === "string"
              ? createIdentity.kind
              : "user_agent",
          transportProvider: TRANSPORT_PROVIDER.telethon,
          ownershipType:
            typeof createIdentity.ownershipType === "string"
              ? createIdentity.ownershipType
              : ownerType === OWNER_TYPE.mattInternal
                ? "meetmatt_managed"
                : "customer_owned",
          status:
            typeof createIdentity.status === "string"
              ? createIdentity.status
              : "pending",
          userId,
          workspaceId,
          displayName:
            typeof createIdentity.displayName === "string"
              ? createIdentity.displayName
              : agentName,
          externalTelegramUserId:
            typeof createIdentity.externalTelegramUserId === "string"
              ? createIdentity.externalTelegramUserId
              : null,
          externalTelegramUsername:
            typeof createIdentity.externalTelegramUsername === "string"
              ? createIdentity.externalTelegramUsername
              : null,
          externalPhone:
            typeof createIdentity.externalPhone === "string"
              ? createIdentity.externalPhone
              : null,
          botToken:
            typeof createIdentity.botToken === "string"
              ? createIdentity.botToken
              : null,
          session:
            typeof createIdentity.session === "string"
              ? createIdentity.session
              : null,
          runtimeLabel:
            typeof createIdentity.runtimeLabel === "string"
              ? createIdentity.runtimeLabel
              : null,
          metadata:
            createIdentity.metadata && typeof createIdentity.metadata === "object"
              ? (createIdentity.metadata as Prisma.InputJsonValue)
              : {
                  source: "internal-telethon-agent-create",
                } satisfies Prisma.InputJsonObject,
          links: [{ agentId: agent.id, role: "primary" }],
        })
      : null;

    return NextResponse.json({
      agent,
      identity,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Telethon/Agents] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
