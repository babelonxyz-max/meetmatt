import "dotenv/config";

import { OwnerType, PrismaClient } from "@prisma/client";
import { ensurePersonalWorkspaceForUser } from "../lib/workspaces";

type Counter = {
  scanned: number;
  updated: number;
  unresolved: number;
};

type ResolvedWorkspace = {
  workspaceId: string;
  action: "noop" | "promote" | "create";
};

const prisma = new PrismaClient();

const dryRun =
  process.argv.includes("--dry-run") ||
  /^(1|true|yes|on)$/i.test(process.env.DRY_RUN ?? "");

function showHelp(): boolean {
  if (!process.argv.includes("--help")) {
    return false;
  }

  console.log("Usage: npm run backfill:workspaces -- [--dry-run]");
  console.log("");
  console.log("Backfills personal/default workspaces and workspaceId ownership on existing data.");
  console.log("Run against a database only after the Prisma schema has been pushed.");
  return true;
}

function createCounter(): Counter {
  return {
    scanned: 0,
    updated: 0,
    unresolved: 0,
  };
}

function printCounter(label: string, counter: Counter) {
  console.log(
    `${label}: scanned=${counter.scanned} updated=${counter.updated} unresolved=${counter.unresolved}`,
  );
}

function buildDryRunWorkspaceId(userId: string): string {
  return `dry-run-workspace-${userId}`;
}

function getMetadataString(
  metadata: unknown,
  key: string,
): string | null {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

async function updateRecord(
  label: string,
  id: string,
  updater: () => Promise<unknown>,
) {
  if (dryRun) {
    console.log(`[dry-run] ${label} ${id}`);
    return;
  }

  await updater();
}

async function main() {
  if (showHelp()) {
    return;
  }

  const userWorkspaceMap = new Map<string, string>();

  const workspaceSeedCounter = createCounter();
  const relationshipCounter = createCounter();
  const agentCounter = createCounter();
  const paymentCounter = createCounter();
  const grantCounter = createCounter();
  const threadCounter = createCounter();
  const ticketCounter = createCounter();
  const identityCounter = createCounter();
  const bindingCounter = createCounter();
  const fleetCounter = createCounter();
  const relationshipWorkspaceMap = new Map<string, string>();
  const relationshipById = new Map<string, string>();
  const agentWorkspaceMap = new Map<string, string>();
  const threadWorkspaceMap = new Map<string, string>();
  const identityWorkspaceMap = new Map<string, string>();

  async function resolveWorkspaceForUser(
    userId: string,
  ): Promise<ResolvedWorkspace> {
    const defaultMembership = await prisma.workspaceMembership.findFirst({
      where: {
        userId,
        isDefault: true,
      },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true },
    });

    if (defaultMembership?.workspaceId) {
      return {
        workspaceId: defaultMembership.workspaceId,
        action: "noop",
      };
    }

    const personalMembership = await prisma.workspaceMembership.findFirst({
      where: {
        userId,
        workspace: {
          kind: "personal",
        },
      },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true },
    });

    if (personalMembership?.workspaceId) {
      if (dryRun) {
        return {
          workspaceId: personalMembership.workspaceId,
          action: "promote",
        };
      }

      const workspace = await ensurePersonalWorkspaceForUser(userId, prisma);
      return {
        workspaceId: workspace.workspaceId,
        action: "promote",
      };
    }

    if (dryRun) {
      return {
        workspaceId: buildDryRunWorkspaceId(userId),
        action: "create",
      };
    }

    const workspace = await ensurePersonalWorkspaceForUser(userId, prisma);
    return {
      workspaceId: workspace.workspaceId,
      action: "create",
    };
  }

  async function getWorkspaceIdForUser(
    userId: string | null | undefined,
  ): Promise<string | null> {
    if (!userId) {
      return null;
    }

    const cached = userWorkspaceMap.get(userId);
    if (cached) {
      return cached;
    }

    const workspace = await resolveWorkspaceForUser(userId);
    userWorkspaceMap.set(userId, workspace.workspaceId);
    return workspace.workspaceId;
  }

  console.log(
    `Workspace backfill starting${dryRun ? " (dry-run)" : ""}...`,
  );

  const users = await prisma.user.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  for (const user of users) {
    workspaceSeedCounter.scanned += 1;
    const workspace = await resolveWorkspaceForUser(user.id);
    userWorkspaceMap.set(user.id, workspace.workspaceId);

    if (workspace.action !== "noop") {
      workspaceSeedCounter.updated += 1;
    }
  }

  for (const relationship of await prisma.customerRelationship.findMany({
    where: { workspaceId: { not: null } },
    select: {
      assignedAgentId: true,
      workspaceId: true,
      id: true,
    },
  })) {
    if (relationship.workspaceId) {
      relationshipById.set(relationship.id, relationship.workspaceId);
      relationshipWorkspaceMap.set(relationship.id, relationship.workspaceId);
      relationshipWorkspaceMap.set(`agent:${relationship.assignedAgentId}`, relationship.workspaceId);
    }
  }

  const relationships = await prisma.customerRelationship.findMany({
    where: { workspaceId: null },
    select: {
      id: true,
      userId: true,
      assignedAgentId: true,
    },
  });

  for (const relationship of relationships) {
    relationshipCounter.scanned += 1;
    const workspaceId = await getWorkspaceIdForUser(relationship.userId);
    if (!workspaceId) {
      relationshipCounter.unresolved += 1;
      continue;
    }

    relationshipCounter.updated += 1;
    relationshipById.set(relationship.id, workspaceId);
    relationshipWorkspaceMap.set(relationship.id, workspaceId);
    relationshipWorkspaceMap.set(`agent:${relationship.assignedAgentId}`, workspaceId);
    await updateRecord("customerRelationship", relationship.id, () =>
      prisma.customerRelationship.update({
        where: { id: relationship.id },
        data: { workspaceId },
      }),
    );
  }

  for (const agent of await prisma.agent.findMany({
    where: { workspaceId: { not: null } },
    select: { id: true, workspaceId: true },
  })) {
    if (agent.workspaceId) {
      agentWorkspaceMap.set(agent.id, agent.workspaceId);
    }
  }

  const agents = await prisma.agent.findMany({
    where: { workspaceId: null },
    select: {
      id: true,
      userId: true,
      ownerType: true,
      agentKind: true,
      metadata: true,
    },
  });

  for (const agent of agents) {
    agentCounter.scanned += 1;
    let workspaceId = await getWorkspaceIdForUser(agent.userId);

    if (!workspaceId) {
      workspaceId = getMetadataString(agent.metadata, "assignedWorkspaceId");
    }

    if (!workspaceId) {
      const assignedUserId = getMetadataString(agent.metadata, "assignedUserId");
      workspaceId = await getWorkspaceIdForUser(assignedUserId);
    }

    if (!workspaceId) {
      workspaceId = relationshipWorkspaceMap.get(`agent:${agent.id}`) ?? null;
    }

    if (!workspaceId && agent.ownerType === OwnerType.customer && agent.userId) {
      workspaceId = await getWorkspaceIdForUser(agent.userId);
    }

    if (!workspaceId) {
      agentCounter.unresolved += 1;
      continue;
    }

    agentCounter.updated += 1;
    agentWorkspaceMap.set(agent.id, workspaceId);
    await updateRecord("agent", agent.id, () =>
      prisma.agent.update({
        where: { id: agent.id },
        data: { workspaceId },
      }),
    );
  }

  const payments = await prisma.payment.findMany({
    where: {
      workspaceId: null,
      userId: { not: null },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  for (const payment of payments) {
    paymentCounter.scanned += 1;
    const workspaceId = await getWorkspaceIdForUser(payment.userId);
    if (!workspaceId) {
      paymentCounter.unresolved += 1;
      continue;
    }

    paymentCounter.updated += 1;
    await updateRecord("payment", payment.id, () =>
      prisma.payment.update({
        where: { id: payment.id },
        data: { workspaceId },
      }),
    );
  }

  const grants = await prisma.entitlementPackGrant.findMany({
    where: { workspaceId: null },
    select: {
      id: true,
      scopeType: true,
      agentId: true,
      userId: true,
    },
  });

  for (const grant of grants) {
    grantCounter.scanned += 1;
    const workspaceId =
      (grant.agentId ? agentWorkspaceMap.get(grant.agentId) : null) ??
      (await getWorkspaceIdForUser(grant.userId));

    if (!workspaceId) {
      grantCounter.unresolved += 1;
      continue;
    }

    grantCounter.updated += 1;
    await updateRecord("entitlementPackGrant", grant.id, () =>
      prisma.entitlementPackGrant.update({
        where: { id: grant.id },
        data: { workspaceId },
      }),
    );
  }

  for (const thread of await prisma.conversationThread.findMany({
    where: { workspaceId: { not: null } },
    select: { id: true, workspaceId: true },
  })) {
    if (thread.workspaceId) {
      threadWorkspaceMap.set(thread.id, thread.workspaceId);
    }
  }

  const threads = await prisma.conversationThread.findMany({
    where: { workspaceId: null },
    select: {
      id: true,
      userId: true,
      relationshipId: true,
    },
  });

  for (const thread of threads) {
    threadCounter.scanned += 1;
    const workspaceId =
      (thread.relationshipId
        ? relationshipById.get(thread.relationshipId)
        : null) ??
      (await getWorkspaceIdForUser(thread.userId));

    if (!workspaceId) {
      threadCounter.unresolved += 1;
      continue;
    }

    threadCounter.updated += 1;
    threadWorkspaceMap.set(thread.id, workspaceId);
    await updateRecord("conversationThread", thread.id, () =>
      prisma.conversationThread.update({
        where: { id: thread.id },
        data: { workspaceId },
      }),
    );
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { workspaceId: null },
    select: {
      id: true,
      userId: true,
      relationshipId: true,
      conversationThreadId: true,
    },
  });

  for (const ticket of tickets) {
    ticketCounter.scanned += 1;
    const workspaceId =
      (ticket.relationshipId
        ? relationshipById.get(ticket.relationshipId)
        : null) ??
      (ticket.conversationThreadId
        ? threadWorkspaceMap.get(ticket.conversationThreadId)
        : null) ??
      (await getWorkspaceIdForUser(ticket.userId));

    if (!workspaceId) {
      ticketCounter.unresolved += 1;
      continue;
    }

    ticketCounter.updated += 1;
    await updateRecord("supportTicket", ticket.id, () =>
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { workspaceId },
      }),
    );
  }

  for (const identity of await prisma.telegramIdentity.findMany({
    where: { workspaceId: { not: null } },
    select: { id: true, workspaceId: true },
  })) {
    if (identity.workspaceId) {
      identityWorkspaceMap.set(identity.id, identity.workspaceId);
    }
  }

  const identities = await prisma.telegramIdentity.findMany({
    where: { workspaceId: null },
    select: {
      id: true,
      userId: true,
      agentLinks: {
        select: {
          agentId: true,
        },
      },
    },
  });

  for (const identity of identities) {
    identityCounter.scanned += 1;
    let workspaceId = await getWorkspaceIdForUser(identity.userId);

    if (!workspaceId) {
      const linkedWorkspaces = new Set(
        identity.agentLinks
          .map((link) => agentWorkspaceMap.get(link.agentId))
          .filter((value): value is string => Boolean(value)),
      );

      if (linkedWorkspaces.size === 1) {
        workspaceId = [...linkedWorkspaces][0] ?? null;
      }
    }

    if (!workspaceId) {
      identityCounter.unresolved += 1;
      continue;
    }

    identityCounter.updated += 1;
    identityWorkspaceMap.set(identity.id, workspaceId);
    await updateRecord("telegramIdentity", identity.id, () =>
      prisma.telegramIdentity.update({
        where: { id: identity.id },
        data: { workspaceId },
      }),
    );
  }

  const bindings = await prisma.telegramThreadBinding.findMany({
    where: { workspaceId: null },
    select: {
      id: true,
      userId: true,
      agentId: true,
      relationshipId: true,
      conversationThreadId: true,
      telegramIdentityId: true,
    },
  });

  for (const binding of bindings) {
    bindingCounter.scanned += 1;
    const workspaceId =
      (binding.relationshipId
        ? relationshipById.get(binding.relationshipId)
        : null) ??
      (binding.conversationThreadId
        ? threadWorkspaceMap.get(binding.conversationThreadId)
        : null) ??
      (binding.agentId ? agentWorkspaceMap.get(binding.agentId) : null) ??
      (await getWorkspaceIdForUser(binding.userId)) ??
      identityWorkspaceMap.get(binding.telegramIdentityId) ??
      null;

    if (!workspaceId) {
      bindingCounter.unresolved += 1;
      continue;
    }

    bindingCounter.updated += 1;
    await updateRecord("telegramThreadBinding", binding.id, () =>
      prisma.telegramThreadBinding.update({
        where: { id: binding.id },
        data: { workspaceId },
      }),
    );
  }

  const customerFleets = await prisma.fleet.findMany({
    where: {
      workspaceId: null,
      ownerType: OwnerType.customer,
    },
    select: {
      id: true,
      memberships: {
        select: {
          agentId: true,
        },
      },
      tasks: {
        select: {
          requesterUserId: true,
        },
      },
    },
  });

  for (const fleet of customerFleets) {
    fleetCounter.scanned += 1;
    const candidateWorkspaces = new Set<string>();

    for (const membership of fleet.memberships) {
      const workspaceId = agentWorkspaceMap.get(membership.agentId);
      if (workspaceId) {
        candidateWorkspaces.add(workspaceId);
      }
    }

    for (const task of fleet.tasks) {
      const workspaceId = await getWorkspaceIdForUser(task.requesterUserId);
      if (workspaceId) {
        candidateWorkspaces.add(workspaceId);
      }
    }

    if (candidateWorkspaces.size !== 1) {
      fleetCounter.unresolved += 1;
      continue;
    }

    const [workspaceId] = [...candidateWorkspaces];
    if (!workspaceId) {
      fleetCounter.unresolved += 1;
      continue;
    }

    fleetCounter.updated += 1;
    await updateRecord("fleet", fleet.id, () =>
      prisma.fleet.update({
        where: { id: fleet.id },
        data: { workspaceId },
      }),
    );
  }

  console.log("");
  printCounter("workspace seeds", workspaceSeedCounter);
  printCounter("relationships", relationshipCounter);
  printCounter("agents", agentCounter);
  printCounter("payments", paymentCounter);
  printCounter("entitlement grants", grantCounter);
  printCounter("threads", threadCounter);
  printCounter("tickets", ticketCounter);
  printCounter("telegram identities", identityCounter);
  printCounter("telegram bindings", bindingCounter);
  printCounter("customer fleets", fleetCounter);
  console.log("");
  console.log("Workspace backfill completed.");
}

main()
  .catch((error) => {
    console.error("Workspace backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
