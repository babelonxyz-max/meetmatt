import {
  Prisma,
  UsageChargeMode,
  UsageResult,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncCapabilityCommerceCatalog } from "@/lib/capability-commerce/registry";

type ResolvedSkillExecution = {
  skillDefinitionId: string;
  skillSlug: string;
  skillName: string;
  implementationId: string;
  implementationKey: string;
  qualityTier: "premium" | "cheap" | "free";
  runtimeEngine: string;
  entitlementGrantId: string | null;
  allowanceId: string | null;
  meterKey: string | null;
  chargeMode: UsageChargeMode;
  fallbackTriggered: boolean;
  customerNoticeRequired: boolean;
  decisionReason: string;
};

type ReservedSkillUsage = ResolvedSkillExecution & {
  reservationApplied: boolean;
  reservedUnits: number;
};

function normalizeUnits(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : 1;
}

function qualityOrder(value: string): number {
  switch (value) {
    case "premium":
      return 3;
    case "cheap":
      return 2;
    case "free":
    default:
      return 1;
  }
}

function grantSourcePriority(source: string): number {
  if (source.startsWith("template:")) {
    return 0;
  }
  if (source.includes("topup")) {
    return 2;
  }
  return 1;
}

export async function resolveSkillExecutionForAgent(params: {
  agentId: string;
  skillSlug: string;
  units?: number;
}): Promise<ResolvedSkillExecution> {
  await syncCapabilityCommerceCatalog();
  const requestedUnits = normalizeUnits(params.units);
  const now = new Date();

  const agent = await prisma.agent.findUnique({
    where: { id: params.agentId },
    include: {
      skillBindings: {
        where: {
          status: "active",
          skillDefinition: {
            slug: params.skillSlug,
          },
        },
        include: {
          skillDefinition: {
            include: {
              implementations: {
                where: { availabilityStatus: "active" },
                orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
              },
            },
          },
          defaultImplementation: true,
        },
        take: 1,
      },
      entitlementPackGrants: {
        where: {
          status: "active",
          startsAt: {
            lte: now,
          },
          OR: [
            {
              endsAt: null,
            },
            {
              endsAt: {
                gte: now,
              },
            },
          ],
        },
        include: {
          allowances: {
            where: {
              skillDefinition: {
                slug: params.skillSlug,
              },
            },
            include: {
              skillDefinition: true,
            },
          },
        },
      },
    },
  });

  if (!agent) {
    throw { status: 404, message: "Agent not found" };
  }

  const binding = agent.skillBindings[0];
  if (!binding) {
    throw { status: 404, message: `Skill not bound to agent: ${params.skillSlug}` };
  }

  const implementations = [
    ...(binding.defaultImplementation
      ? [binding.defaultImplementation]
      : []),
    ...binding.skillDefinition.implementations.filter(
      (implementation) =>
        !binding.defaultImplementation ||
        implementation.id !== binding.defaultImplementation.id,
    ),
  ].sort((a, b) => {
    const qualityDelta = qualityOrder(b.qualityTier) - qualityOrder(a.qualityTier);
    if (qualityDelta !== 0) {
      return qualityDelta;
    }
    return b.priority - a.priority;
  });

  const activeAllowances = agent.entitlementPackGrants
    .flatMap((grant) =>
      grant.allowances.map((allowance) => ({
        grantId: grant.id,
        source: grant.source,
        allowance,
      })),
    )
    .sort((left, right) => grantSourcePriority(left.source) - grantSourcePriority(right.source));

  for (const implementation of implementations) {
    if (!implementation.requiresEntitlement) {
      return {
        skillDefinitionId: binding.skillDefinitionId,
        skillSlug: binding.skillDefinition.slug,
        skillName: binding.skillDefinition.name,
        implementationId: implementation.id,
        implementationKey: implementation.implementationKey,
        qualityTier: implementation.qualityTier,
        runtimeEngine: implementation.runtimeEngine,
        entitlementGrantId: null,
        allowanceId: null,
        meterKey: null,
        chargeMode:
          implementation.qualityTier === "premium"
            ? UsageChargeMode.included
            : implementation.qualityTier === "cheap"
              ? UsageChargeMode.fallback_cheap
              : UsageChargeMode.fallback_free,
        fallbackTriggered: implementation.qualityTier !== "premium",
        customerNoticeRequired: implementation.qualityTier !== "premium",
        decisionReason:
          implementation.qualityTier === "premium"
            ? "premium_without_meter"
            : implementation.qualityTier === "cheap"
              ? "fallback_cheap_available"
              : "fallback_free_available",
      };
    }

    const allowanceMatch = activeAllowances.find(({ allowance }) => {
      if (allowance.remainingUnits === null || allowance.includedUnits === null) {
        return true;
      }
      return allowance.remainingUnits >= requestedUnits;
    });

    if (allowanceMatch) {
      const source = allowanceMatch.source;
      const chargeMode = source.includes("topup")
        ? UsageChargeMode.topup
        : UsageChargeMode.included;

      return {
        skillDefinitionId: binding.skillDefinitionId,
        skillSlug: binding.skillDefinition.slug,
        skillName: binding.skillDefinition.name,
        implementationId: implementation.id,
        implementationKey: implementation.implementationKey,
        qualityTier: implementation.qualityTier,
        runtimeEngine: implementation.runtimeEngine,
        entitlementGrantId: allowanceMatch.grantId,
        allowanceId: allowanceMatch.allowance.id,
        meterKey: allowanceMatch.allowance.meterKey,
        chargeMode,
        fallbackTriggered: false,
        customerNoticeRequired: false,
        decisionReason: `${chargeMode}_allowance_available`,
      };
    }
  }

  throw {
    status: 402,
    message: `No available implementation or entitlement for skill: ${params.skillSlug}`,
  };
}

export async function reserveSkillUsageForAgent(params: {
  agentId: string;
  skillSlug: string;
  units?: number;
}): Promise<ReservedSkillUsage> {
  await syncCapabilityCommerceCatalog();
  const requestedUnits = normalizeUnits(params.units);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const resolved = await resolveSkillExecutionForAgent({
      agentId: params.agentId,
      skillSlug: params.skillSlug,
      units: requestedUnits,
    });

    if (!resolved.allowanceId) {
      return {
        ...resolved,
        reservationApplied: false,
        reservedUnits: requestedUnits,
      };
    }

    const allowance = await prisma.entitlementAllowance.findUnique({
      where: { id: resolved.allowanceId },
      select: {
        id: true,
        remainingUnits: true,
        includedUnits: true,
      },
    });

    if (!allowance) {
      continue;
    }

    if (allowance.remainingUnits === null || allowance.includedUnits === null) {
      await prisma.entitlementAllowance.update({
        where: { id: allowance.id },
        data: {
          consumedUnits: {
            increment: requestedUnits,
          },
        },
      });

      return {
        ...resolved,
        reservationApplied: true,
        reservedUnits: requestedUnits,
      };
    }

    const updated = await prisma.entitlementAllowance.updateMany({
      where: {
        id: allowance.id,
        remainingUnits: {
          gte: requestedUnits,
        },
      },
      data: {
        consumedUnits: {
          increment: requestedUnits,
        },
        remainingUnits: {
          decrement: requestedUnits,
        },
      },
    });

    if (updated.count === 1) {
      return {
        ...resolved,
        reservationApplied: true,
        reservedUnits: requestedUnits,
      };
    }
  }

  throw {
    status: 409,
    message: `Unable to reserve allowance for skill: ${params.skillSlug}`,
  };
}

export async function finalizeReservedSkillUsage(params: {
  reservation: ReservedSkillUsage;
  agentId: string;
  userId?: string | null;
  runId?: string | null;
  units?: number;
  unitType?: string;
  costBasis?: Prisma.InputJsonValue;
  result?: UsageResult;
  refundOnFailure?: boolean;
}): Promise<void> {
  const reservedUnits = params.reservation.reservedUnits ?? 1;
  const units = normalizeUnits(params.units ?? reservedUnits);
  const result = params.result ?? UsageResult.succeeded;

  if (
    params.reservation.reservationApplied &&
    units !== reservedUnits
  ) {
    throw {
      status: 400,
      message: `units must match reserved reservation size (${reservedUnits})`,
    };
  }

  if (
    result !== UsageResult.succeeded &&
    params.refundOnFailure &&
    params.reservation.reservationApplied &&
    params.reservation.allowanceId
  ) {
    const allowance = await prisma.entitlementAllowance.findUnique({
      where: { id: params.reservation.allowanceId },
      select: {
        remainingUnits: true,
        includedUnits: true,
      },
    });

    if (allowance) {
      await prisma.entitlementAllowance.update({
        where: { id: params.reservation.allowanceId },
        data: {
          consumedUnits: {
            decrement: units,
          },
          ...(allowance.remainingUnits !== null && allowance.includedUnits !== null
            ? {
                remainingUnits: {
                  increment: units,
                },
              }
            : {}),
        },
      });
    }
  }

  await prisma.usageLedgerEntry.create({
    data: {
      agentId: params.agentId,
      userId: params.userId ?? null,
      runId: params.runId ?? null,
      skillDefinitionId: params.reservation.skillDefinitionId,
      skillImplementationId: params.reservation.implementationId,
      entitlementGrantId: params.reservation.entitlementGrantId,
      meterKey: params.reservation.meterKey ?? "unmetered",
      units,
      unitType: params.unitType ?? "unit",
      costBasis: params.costBasis,
      chargeMode: params.reservation.chargeMode,
      result,
    },
  });

  await prisma.usageDecisionLog.create({
    data: {
      runId: params.runId ?? null,
      agentId: params.agentId,
      skillDefinitionId: params.reservation.skillDefinitionId,
      selectedImplementationId: params.reservation.implementationId,
      selectedEntitlementGrantId: params.reservation.entitlementGrantId,
      decisionReason:
        result === UsageResult.succeeded
          ? params.reservation.decisionReason
          : `${params.reservation.decisionReason}:execution_failed`,
      fallbackTriggered: params.reservation.fallbackTriggered,
      approvalTriggered: false,
      customerNoticeRequired: params.reservation.customerNoticeRequired,
      metadata: {
        implementationKey: params.reservation.implementationKey,
        qualityTier: params.reservation.qualityTier,
        runtimeEngine: params.reservation.runtimeEngine,
        reservationApplied: params.reservation.reservationApplied,
      } satisfies Prisma.InputJsonObject,
    },
  });
}
