import "server-only";

import { prisma } from "@/lib/prisma";
import { createConfirmedAdminPaymentForAgent } from "@/lib/admin-payment";
import { createPendingCustomerAgent } from "@/lib/customer-agent-launch";
import { provisionPlanckHqBotFleet } from "@/lib/planck-hq-bot-fleet";
import {
  getLaunchPriceForPurchaseType,
  resolveUserLaunchPricing,
} from "@/lib/user-launch-pricing";
import {
  createWorkspace,
  ensurePersonalWorkspaceForUser,
  upsertWorkspaceMembership,
} from "@/lib/workspaces";

export type AdminLaunchPlan = "monthly" | "day_pass";
export type AdminCustomerAgentUseCase = "assistant" | "fleet";
export type AdminWorkspaceKind = "company" | "personal";

function getAppRequestUrl() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error("APP_URL or NEXT_PUBLIC_APP_URL is required");
  }

  return new URL("/ops/platform", baseUrl).toString();
}

export function parseOptionalUsdValue(value: string | null | undefined): number | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Invalid USD amount");
  }

  return Math.round(parsed * 100) / 100;
}

export async function adminUpdateUserBilling(params: {
  userId: string;
  monthlyLaunchFeeUsd?: number | null;
  dayPassLaunchFeeUsd?: number | null;
  monthlyLaunchFeeWaived?: boolean;
  dayPassLaunchFeeWaived?: boolean;
  billingNotes?: string | null;
}) {
  const userId = params.userId.trim();
  if (!userId) {
    throw { status: 400, message: "userId is required" };
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      monthlyLaunchFeeUsd:
        params.monthlyLaunchFeeUsd === undefined ? undefined : params.monthlyLaunchFeeUsd,
      dayPassLaunchFeeUsd:
        params.dayPassLaunchFeeUsd === undefined ? undefined : params.dayPassLaunchFeeUsd,
      monthlyLaunchFeeWaived:
        params.monthlyLaunchFeeWaived === undefined
          ? undefined
          : params.monthlyLaunchFeeWaived,
      dayPassLaunchFeeWaived:
        params.dayPassLaunchFeeWaived === undefined
          ? undefined
          : params.dayPassLaunchFeeWaived,
      billingNotes:
        params.billingNotes === undefined ? undefined : params.billingNotes?.trim() || null,
    },
    select: {
      id: true,
      monthlyLaunchFeeUsd: true,
      dayPassLaunchFeeUsd: true,
      monthlyLaunchFeeWaived: true,
      dayPassLaunchFeeWaived: true,
      billingNotes: true,
      updatedAt: true,
    },
  });
}

export async function adminCreateWorkspace(params: {
  name: string;
  slug?: string | null;
  kind?: AdminWorkspaceKind;
  ownerUserId?: string | null;
  memberUserIds?: string[];
}) {
  return createWorkspace({
    name: params.name,
    slug: params.slug ?? null,
    kind: params.kind ?? "company",
    ownerUserId: params.ownerUserId ?? null,
    memberUserIds: params.memberUserIds ?? [],
  });
}

export async function adminCreateCustomerAgent(params: {
  userId: string;
  workspaceId?: string | null;
  agentName: string;
  personality: string;
  useCase?: AdminCustomerAgentUseCase;
  useCaseSlug?: string | null;
  telegramBotToken: string;
  launchPlan?: AdminLaunchPlan;
  activateWithoutPayment?: boolean;
}) {
  const userId = params.userId.trim();
  const agentName = params.agentName.trim();
  const personality = params.personality.trim();
  const telegramBotToken = params.telegramBotToken.trim();
  const useCase = params.useCase ?? "assistant";
  const launchPlan = params.launchPlan ?? "monthly";

  if (!userId || !agentName || !personality || !telegramBotToken) {
    throw {
      status: 400,
      message: "userId, agentName, personality, and telegramBotToken are required",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      monthlyLaunchFeeUsd: true,
      dayPassLaunchFeeUsd: true,
      monthlyLaunchFeeWaived: true,
      dayPassLaunchFeeWaived: true,
      billingNotes: true,
    },
  });

  if (!existingUser) {
    throw { status: 404, message: "User not found" };
  }

  const requestedWorkspaceId = params.workspaceId?.trim() || null;
  const resolvedWorkspaceId = requestedWorkspaceId
    ? requestedWorkspaceId
    : (await ensurePersonalWorkspaceForUser(userId)).workspaceId;

  if (requestedWorkspaceId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: requestedWorkspaceId },
      select: { id: true },
    });

    if (!workspace) {
      throw { status: 404, message: "Workspace not found" };
    }

    await upsertWorkspaceMembership({
      workspaceId: requestedWorkspaceId,
      userId,
      role: "member",
    });
  }

  const agent = await createPendingCustomerAgent({
    userId,
    workspaceId: resolvedWorkspaceId,
    agentName,
    personality,
    useCase,
    useCaseSlug: params.useCaseSlug?.trim() || null,
    telegramBotToken,
    source: "ops-platform",
  });

  let amountUsd: number | null = null;
  if (params.activateWithoutPayment) {
    const pricing = resolveUserLaunchPricing(existingUser);
    amountUsd = getLaunchPriceForPurchaseType(
      pricing,
      launchPlan === "day_pass" ? "day_pass" : "subscription",
    );

    await createConfirmedAdminPaymentForAgent({
      agentId: agent.id,
      userId,
      workspaceId: resolvedWorkspaceId,
      plan: launchPlan,
      amountUsd,
      requestUrl: getAppRequestUrl(),
      source: "ops-customer-agent-create",
      notes: existingUser.billingNotes ?? "Activated from ops without external checkout",
    });
  }

  return {
    agentId: agent.id,
    workspaceId: resolvedWorkspaceId,
    activatedWithoutPayment: Boolean(params.activateWithoutPayment),
    amountUsd,
  };
}

export async function adminConfirmCustomerAgentWithoutPayment(params: {
  agentId: string;
  launchPlan?: AdminLaunchPlan;
}) {
  const agentId = params.agentId.trim();
  const launchPlan = params.launchPlan ?? "monthly";

  if (!agentId) {
    throw { status: 400, message: "agentId is required" };
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      ownerType: true,
      userId: true,
      workspaceId: true,
    },
  });

  if (!agent) {
    throw { status: 404, message: "Agent not found" };
  }

  if (agent.ownerType !== "customer") {
    throw { status: 400, message: "Only customer agents can be manually activated here" };
  }

  const user = agent.userId
    ? await prisma.user.findUnique({
        where: { id: agent.userId },
        select: {
          monthlyLaunchFeeUsd: true,
          dayPassLaunchFeeUsd: true,
          monthlyLaunchFeeWaived: true,
          dayPassLaunchFeeWaived: true,
          billingNotes: true,
        },
      })
    : null;

  const pricing = resolveUserLaunchPricing(user);
  const amountUsd = getLaunchPriceForPurchaseType(
    pricing,
    launchPlan === "day_pass" ? "day_pass" : "subscription",
  );

  await createConfirmedAdminPaymentForAgent({
    agentId: agent.id,
    userId: agent.userId,
    workspaceId: agent.workspaceId,
    plan: launchPlan,
    amountUsd,
    requestUrl: getAppRequestUrl(),
    source: "ops-manual-activation",
    notes: user?.billingNotes ?? "Manually activated from ops without external checkout",
  });

  return {
    agentId: agent.id,
    amountUsd,
    launchPlan,
  };
}

export async function adminProvisionPlanckHqFleet(params: {
  userId: string;
  workspaceId?: string | null;
  identityStatus?: string | null;
  identityOwnershipType?: string | null;
}) {
  const userId = params.userId.trim();
  if (!userId) {
    throw { status: 400, message: "userId is required" };
  }

  return provisionPlanckHqBotFleet({
    userId,
    workspaceId: params.workspaceId?.trim() || null,
    identityStatus: params.identityStatus?.trim() || null,
    identityOwnershipType: params.identityOwnershipType?.trim() || null,
  });
}
