"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getErrorMessage } from "@/lib/http-error";
import { requireOpsSession } from "@/lib/ops-auth";
import { prisma } from "@/lib/prisma";
import { createConfirmedAdminPaymentForAgent } from "@/lib/admin-payment";
import { createPendingCustomerAgent } from "@/lib/customer-agent-launch";
import { provisionPlanckHqBotFleet } from "@/lib/planck-hq-bot-fleet";
import {
  getLaunchPriceForPurchaseType,
  resolveUserLaunchPricing,
} from "@/lib/user-launch-pricing";
import { createWorkspace } from "@/lib/workspaces";
import {
  ensurePersonalWorkspaceForUser,
  upsertWorkspaceMembership,
} from "@/lib/workspaces";

function getStringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getMemberUserIds(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function getBooleanValue(formData: FormData, key: string) {
  const value = getStringValue(formData, key);
  return value === "true" || value === "1" || value === "on";
}

function getOptionalUsdValue(formData: FormData, key: string): number | null {
  const value = getStringValue(formData, key);
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid USD amount for ${key}`);
  }

  return Math.round(parsed * 100) / 100;
}

function getAppRequestUrl() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error("APP_URL or NEXT_PUBLIC_APP_URL is required");
  }

  return new URL("/ops/platform", baseUrl).toString();
}

function platformRedirectUrl(params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value.length > 0) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `/ops/platform?${query}` : "/ops/platform";
}

function refreshPlatform() {
  revalidatePath("/ops");
  revalidatePath("/ops/platform");
  revalidatePath("/ops/telegram-inventory");
}

export async function updateUserBillingAction(formData: FormData) {
  await requireOpsSession("/ops/platform");
  const userId = getStringValue(formData, "userId");

  if (!userId) {
    redirect(
      platformRedirectUrl({
        error: "billing-user-required",
      }),
    );
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyLaunchFeeUsd: getOptionalUsdValue(formData, "monthlyLaunchFeeUsd"),
        dayPassLaunchFeeUsd: getOptionalUsdValue(formData, "dayPassLaunchFeeUsd"),
        monthlyLaunchFeeWaived: getBooleanValue(formData, "monthlyLaunchFeeWaived"),
        dayPassLaunchFeeWaived: getBooleanValue(formData, "dayPassLaunchFeeWaived"),
        billingNotes: getStringValue(formData, "billingNotes") || null,
      },
    });

    refreshPlatform();
    redirect(
      platformRedirectUrl({
        notice: "billing-updated",
        userId,
      }),
    );
  } catch (error) {
    console.error("[Ops/Platform] Failed to update user billing:", error);
    redirect(
      platformRedirectUrl({
        error: "billing-update-failed",
        userId,
        message: getErrorMessage(error, "Failed to update user billing"),
      }),
    );
  }
}

export async function createCustomerAgentAction(formData: FormData) {
  await requireOpsSession("/ops/platform");
  const userId = getStringValue(formData, "userId");
  const workspaceId = getStringValue(formData, "workspaceId");
  const agentName = getStringValue(formData, "agentName");
  const personality = getStringValue(formData, "personality");
  const useCase = getStringValue(formData, "useCase") === "fleet" ? "fleet" : "assistant";
  const useCaseSlug = getStringValue(formData, "useCaseSlug");
  const telegramBotToken = getStringValue(formData, "telegramBotToken");
  const launchPlan = getStringValue(formData, "launchPlan") === "day_pass" ? "day_pass" : "monthly";
  const activateWithoutPayment = getBooleanValue(formData, "activateWithoutPayment");

  if (!userId || !agentName || !personality || !telegramBotToken) {
    redirect(
      platformRedirectUrl({
        error: "customer-agent-required",
      }),
    );
  }

  try {
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
      throw new Error("User not found");
    }

    const resolvedWorkspaceId = workspaceId
      ? workspaceId
      : (await ensurePersonalWorkspaceForUser(userId)).workspaceId;

    if (workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true },
      });
      if (!workspace) {
        throw new Error("Workspace not found");
      }

      await upsertWorkspaceMembership({
        workspaceId,
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
      useCaseSlug: useCaseSlug || null,
      telegramBotToken,
      source: "ops-platform",
    });

    if (activateWithoutPayment) {
      const pricing = resolveUserLaunchPricing(existingUser);
      const amountUsd = getLaunchPriceForPurchaseType(
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

    refreshPlatform();
    redirect(
      platformRedirectUrl({
        notice: activateWithoutPayment ? "customer-agent-activated" : "customer-agent-created",
        agentId: agent.id,
        userId,
      }),
    );
  } catch (error) {
    console.error("[Ops/Platform] Failed to create customer agent:", error);
    redirect(
      platformRedirectUrl({
        error: "customer-agent-create-failed",
        userId,
        message: getErrorMessage(error, "Failed to create customer agent"),
      }),
    );
  }
}

export async function confirmCustomerAgentWithoutPaymentAction(formData: FormData) {
  await requireOpsSession("/ops/platform");
  const agentId = getStringValue(formData, "agentId");
  const launchPlan = getStringValue(formData, "launchPlan") === "day_pass" ? "day_pass" : "monthly";

  if (!agentId) {
    redirect(
      platformRedirectUrl({
        error: "manual-activation-agent-required",
      }),
    );
  }

  try {
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
      throw new Error("Agent not found");
    }
    if (agent.ownerType !== "customer") {
      throw new Error("Only customer agents can be manually activated here");
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

    refreshPlatform();
    redirect(
      platformRedirectUrl({
        notice: "manual-activation-complete",
        agentId,
      }),
    );
  } catch (error) {
    console.error("[Ops/Platform] Failed to activate customer agent without payment:", error);
    redirect(
      platformRedirectUrl({
        error: "manual-activation-failed",
        agentId,
        message: getErrorMessage(error, "Failed to activate customer agent"),
      }),
    );
  }
}

export async function createWorkspaceAction(formData: FormData) {
  await requireOpsSession("/ops/platform");
  const name = getStringValue(formData, "name");
  const slug = getStringValue(formData, "slug");
  const ownerUserId = getStringValue(formData, "ownerUserId");
  const memberUserIds = getMemberUserIds(getStringValue(formData, "memberUserIds"));
  const kind = getStringValue(formData, "kind") === "personal" ? "personal" : "company";

  if (!name) {
    redirect(
      platformRedirectUrl({
        error: "workspace-name-required",
      }),
    );
  }

  try {
    const workspace = await createWorkspace({
      name,
      slug: slug || null,
      kind,
      ownerUserId: ownerUserId || null,
      memberUserIds,
    });

    refreshPlatform();
    redirect(
      platformRedirectUrl({
        notice: "workspace-created",
        workspaceId: workspace.workspaceId,
      }),
    );
  } catch (error) {
    console.error("[Ops/Platform] Failed to create workspace:", error);
    redirect(
      platformRedirectUrl({
        error: "workspace-create-failed",
        message: getErrorMessage(error, "Failed to create workspace"),
      }),
    );
  }
}

export async function provisionPlanckHqBotFleetAction(formData: FormData) {
  await requireOpsSession("/ops/platform");
  const userId = getStringValue(formData, "userId");
  const workspaceId = getStringValue(formData, "workspaceId");
  const identityStatus = getStringValue(formData, "identityStatus");
  const ownershipType = getStringValue(formData, "ownershipType");

  if (!userId) {
    redirect(
      platformRedirectUrl({
        error: "planck-user-required",
      }),
    );
  }

  try {
    const result = await provisionPlanckHqBotFleet({
      userId,
      workspaceId: workspaceId || null,
      identityStatus: identityStatus || null,
      identityOwnershipType: ownershipType || null,
    });

    refreshPlatform();
    redirect(
      platformRedirectUrl({
        notice: "planck-fleet-provisioned",
        workspaceId: result.workspaceId,
        createdAgents: String(result.createdAgents),
        createdIdentities: String(result.createdIdentities),
        updatedIdentities: String(result.updatedIdentities),
      }),
    );
  } catch (error) {
    console.error("[Ops/Platform] Failed to provision Planck HQ fleet:", error);
    redirect(
      platformRedirectUrl({
        error: "planck-fleet-failed",
        message: getErrorMessage(error, "Failed to provision Planck HQ fleet"),
      }),
    );
  }
}
