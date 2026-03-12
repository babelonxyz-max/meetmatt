"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getErrorMessage } from "@/lib/http-error";
import { requireOpsSession } from "@/lib/ops-auth";
import { provisionPlanckHqBotFleet } from "@/lib/planck-hq-bot-fleet";
import { createWorkspace } from "@/lib/workspaces";

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
