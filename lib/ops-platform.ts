import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLANCK_HQ_BOT_SEAT_COUNT } from "@/lib/planck-hq-bot-fleet";

const workspaceOpsInclude = {
  ownerUser: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  memberships: {
    orderBy: [{ createdAt: "asc" }],
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  },
  _count: {
    select: {
      agents: true,
      payments: true,
      customerRelationships: true,
      supportTickets: true,
      fleets: true,
      telegramIdentities: true,
      telegramBotPacks: true,
    },
  },
} satisfies Prisma.WorkspaceInclude;

const fleetOpsInclude = {
  workspace: {
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
    },
  },
  memberships: {
    orderBy: [{ createdAt: "asc" }],
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          slug: true,
          agentKind: true,
          status: true,
          transportProvider: true,
        },
      },
    },
  },
  _count: {
    select: {
      memberships: true,
      tasks: true,
      runs: true,
    },
  },
} satisfies Prisma.FleetInclude;

const useCaseTemplateOpsInclude = {
  _count: {
    select: {
      agents: true,
      items: true,
      entitlements: true,
    },
  },
} satisfies Prisma.UseCaseTemplateInclude;

export type OpsWorkspaceDetail = Prisma.WorkspaceGetPayload<{
  include: typeof workspaceOpsInclude;
}>;

export type OpsFleetDetail = Prisma.FleetGetPayload<{
  include: typeof fleetOpsInclude;
}>;

export type OpsUseCaseTemplateDetail = Prisma.UseCaseTemplateGetPayload<{
  include: typeof useCaseTemplateOpsInclude;
}>;

export async function getOpsPlatformData() {
  const [
    workspaces,
    fleets,
    useCaseTemplates,
    recentUsers,
    workspaceCount,
    personalWorkspaceCount,
    companyWorkspaceCount,
    fleetCount,
    activeFleetCount,
    telegramBotPackCount,
    readyTelegramBotPackCount,
    useCaseTemplateCount,
    activeUseCaseTemplateCount,
    catalogItemCount,
    activeCatalogItemCount,
    skillDefinitionCount,
    entitlementPackCount,
    planckAgentCount,
  ] = await Promise.all([
    prisma.workspace.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 40,
      include: workspaceOpsInclude,
    }),
    prisma.fleet.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 40,
      include: fleetOpsInclude,
    }),
    prisma.useCaseTemplate.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 30,
      include: useCaseTemplateOpsInclude,
    }),
    prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    }),
    prisma.workspace.count(),
    prisma.workspace.count({ where: { kind: "personal" } }),
    prisma.workspace.count({ where: { kind: "company" } }),
    prisma.fleet.count(),
    prisma.fleet.count({ where: { status: "active" } }),
    prisma.telegramBotPack.count(),
    prisma.telegramBotPack.count({ where: { status: "ready" } }),
    prisma.useCaseTemplate.count(),
    prisma.useCaseTemplate.count({ where: { status: "active" } }),
    prisma.catalogItem.count(),
    prisma.catalogItem.count({ where: { status: "active" } }),
    prisma.skillDefinition.count(),
    prisma.entitlementPack.count(),
    prisma.agent.count({
      where: {
        slug: {
          startsWith: "planck-hq-",
        },
      },
    }),
  ]);

  return {
    generatedAt: new Date(),
    workspaces,
    fleets,
    useCaseTemplates,
    recentUsers,
    metrics: {
      workspaceCount,
      personalWorkspaceCount,
      companyWorkspaceCount,
      fleetCount,
      activeFleetCount,
      telegramBotPackCount,
      readyTelegramBotPackCount,
      useCaseTemplateCount,
      activeUseCaseTemplateCount,
      catalogItemCount,
      activeCatalogItemCount,
      skillDefinitionCount,
      entitlementPackCount,
      planckAgentCount,
      planckSeatCount: PLANCK_HQ_BOT_SEAT_COUNT,
    },
  };
}
