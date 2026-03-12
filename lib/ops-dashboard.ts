import "server-only";

import type { WorkspaceComposioState } from "@/lib/composio";
import { prisma } from "@/lib/prisma";
import type { WorkspaceSeshState } from "@/lib/sesh";
import { evaluateWorkspaceIntegrationReadinessFromStates } from "@/lib/workspace-integrations";

const OPEN_TICKET_STATUSES = ["open", "pending_user", "escalated"] as const;
const ACTIVE_TASK_STATUSES = ["queued", "running", "needs_approval"] as const;
const PENDING_OUTBOUND_STATUSES = ["queued", "claimed"] as const;
const PENDING_PAYMENT_STATUSES = ["pending", "partially_paid"] as const;
const ACTIVE_DEPLOY_JOB_STATUSES = ["queued", "processing"] as const;

function readEnvChecks() {
  const hasInternalSecret = Boolean(
    process.env.TELETHON_INTERNAL_SECRET?.trim() ||
      process.env.INTERNAL_WEBHOOK_SECRET?.trim(),
  );

  return [
    {
      key: "DATABASE_URL",
      label: "Database",
      description: "Prisma + Postgres connection for production state.",
      ready: Boolean(process.env.DATABASE_URL?.trim()),
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      label: "Public app URL",
      description: "Canonical app URL for callbacks and cross-service links.",
      ready: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
    },
    {
      key: "SESH_BASE_URL",
      label: "Sesh gateway",
      description: "Workspace-scoped provider gateway for payments and external integrations.",
      ready: Boolean(process.env.SESH_BASE_URL?.trim()),
    },
    {
      key: "SESH_ADMIN_KEY",
      label: "Sesh admin auth",
      description: "Required for workspace temple provisioning and provider action calls.",
      ready: Boolean(process.env.SESH_ADMIN_KEY?.trim()),
    },
    {
      key: "COMPOSIO_API_KEY",
      label: "Composio API key",
      description: "Required for Composio-first connector execution and session creation.",
      ready: Boolean(process.env.COMPOSIO_API_KEY?.trim()),
    },
    {
      key: "MEETMATT_SESH_WEBHOOK_SECRET",
      label: "Sesh webhook secret",
      description: "Required to trust Sesh-delivered WhatsApp and fallback webhook events.",
      ready: Boolean(process.env.MEETMATT_SESH_WEBHOOK_SECRET?.trim()),
    },
    {
      key: "NOWPAYMENTS_IPN_SECRET",
      label: "Payment webhook auth",
      description: "Required to trust incoming NowPayments confirmations.",
      ready: Boolean(process.env.NOWPAYMENTS_IPN_SECRET?.trim()),
    },
    {
      key: "DODO_PAYMENTS_WEBHOOK_SECRET",
      label: "Card webhook auth",
      description: "Required to trust incoming Dodo card payment events.",
      ready: Boolean(process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim()),
    },
    {
      key: "DODO_PAYMENTS_MATT_PRODUCT_ID",
      label: "Dodo base product",
      description: "Maps the base Matt subscription to a hosted Dodo checkout product.",
      ready: Boolean(process.env.DODO_PAYMENTS_MATT_PRODUCT_ID?.trim()),
    },
    {
      key: "DEVIN_WEBHOOK_SECRET",
      label: "Devin webhook auth",
      description: "Required to trust deployment completion events.",
      ready: Boolean(process.env.DEVIN_WEBHOOK_SECRET?.trim()),
    },
    {
      key: "CORTEX_GATEWAY_URL",
      label: "Cortex gateway",
      description: "Needed for metered model execution from the app.",
      ready: Boolean(process.env.CORTEX_GATEWAY_URL?.trim()),
    },
    {
      key: "TELETHON_INTERNAL_SECRET",
      label: "Internal transport auth",
      description: "Shared secret between runner and app for Telethon routes.",
      ready: hasInternalSecret,
    },
    {
      key: "TELETHON_API_ID",
      label: "Telethon API ID",
      description: "Required to provision real MTProto identities.",
      ready: Boolean(process.env.TELETHON_API_ID?.trim()),
    },
    {
      key: "TELETHON_API_HASH",
      label: "Telethon API hash",
      description: "Required to provision real MTProto identities.",
      ready: Boolean(process.env.TELETHON_API_HASH?.trim()),
    },
    {
      key: "DEPLOY_JOBS_ENABLED",
      label: "Deploy jobs queue",
      description: "Enables durable queued deployment processing.",
      ready:
        process.env.DEPLOY_JOBS_ENABLED?.trim().toLowerCase() === "true" ||
        process.env.DEPLOY_JOBS_ENABLED?.trim() === "1",
    },
  ];
}

export async function getOpsDashboardData() {
  const generatedAt = new Date();
  const envChecks = readEnvChecks();

  const [
    activeRelationships,
    openTickets,
    activeTasks,
    pendingOutbound,
    pendingPayments,
    activeDeployJobs,
    telethonIdentityCount,
    activeBindingCount,
    mattAgentCount,
    relationships,
    tickets,
    tasks,
    threads,
    telethonIdentities,
    outboundMessages,
    threadBindings,
    mattAgentOptions,
    mattAgents,
    recentPayments,
    deployJobs,
    integrationWorkspacesRaw,
  ] = await Promise.all([
    prisma.customerRelationship.count({
      where: { status: "active" },
    }),
    prisma.supportTicket.count({
      where: {
        status: {
          in: [...OPEN_TICKET_STATUSES],
        },
      },
    }),
    prisma.fleetTask.count({
      where: {
        status: {
          in: [...ACTIVE_TASK_STATUSES],
        },
      },
    }),
    prisma.outboundTransportMessage.count({
      where: {
        status: {
          in: [...PENDING_OUTBOUND_STATUSES],
        },
      },
    }),
    prisma.payment.count({
      where: {
        status: {
          in: [...PENDING_PAYMENT_STATUSES],
        },
      },
    }),
    prisma.deployJob.count({
      where: {
        status: {
          in: [...ACTIVE_DEPLOY_JOB_STATUSES],
        },
      },
    }),
    prisma.telegramIdentity.count({
      where: {
        transportProvider: "telethon",
        status: {
          in: ["pending", "active", "error"],
        },
      },
    }),
    prisma.telegramThreadBinding.count({
      where: {
        status: "active",
      },
    }),
    prisma.agent.count({
      where: {
        ownerType: "matt_internal",
      },
    }),
    prisma.customerRelationship.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            slug: true,
            agentKind: true,
            status: true,
            transportProvider: true,
            cortexId: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            conversationThreads: true,
            supportTickets: true,
            telegramThreadBindings: true,
          },
        },
      },
    }),
    prisma.supportTicket.findMany({
      where: {
        status: {
          in: [...OPEN_TICKET_STATUSES],
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        relationship: {
          select: {
            id: true,
            role: true,
            slaTier: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            agentKind: true,
          },
        },
        conversationThread: {
          select: {
            id: true,
            channel: true,
            externalThreadId: true,
            title: true,
            lastInboundAt: true,
            lastOutboundAt: true,
          },
        },
      },
    }),
    prisma.fleetTask.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 8,
      include: {
        fleet: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
          },
        },
        requester: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            agentKind: true,
            status: true,
          },
        },
        ticket: {
          select: {
            id: true,
            status: true,
            priority: true,
            subject: true,
          },
        },
        conversationThread: {
          select: {
            id: true,
            channel: true,
            externalThreadId: true,
            title: true,
            lastMessageAt: true,
          },
        },
      },
    }),
    prisma.conversationThread.findMany({
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
      take: 8,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        relationship: {
          select: {
            id: true,
            role: true,
            assignedAgentId: true,
          },
        },
        _count: {
          select: {
            supportTickets: true,
            fleetTasks: true,
            outboundTransportMessages: true,
            telegramThreadBindings: true,
          },
        },
      },
    }),
    prisma.telegramIdentity.findMany({
      where: {
        transportProvider: "telethon",
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        agentLinks: {
          orderBy: [{ createdAt: "asc" }],
          take: 3,
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                slug: true,
                ownerType: true,
                agentKind: true,
                status: true,
                activationStatus: true,
              },
            },
          },
        },
        _count: {
          select: {
            threadBindings: true,
          },
        },
      },
    }),
    prisma.outboundTransportMessage.findMany({
      where: {
        status: {
          in: ["queued", "claimed", "failed"],
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            slug: true,
            agentKind: true,
          },
        },
        telegramIdentity: {
          select: {
            id: true,
            displayName: true,
            externalTelegramUsername: true,
            status: true,
          },
        },
        conversationThread: {
          select: {
            id: true,
            channel: true,
            externalThreadId: true,
            title: true,
          },
        },
        fleetTask: {
          select: {
            id: true,
            type: true,
            status: true,
            title: true,
          },
        },
      },
    }),
    prisma.telegramThreadBinding.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      include: {
        telegramIdentity: {
          select: {
            id: true,
            displayName: true,
            externalTelegramUsername: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            agentKind: true,
            status: true,
          },
        },
        relationship: {
          select: {
            id: true,
            role: true,
            slaTier: true,
          },
        },
        conversationThread: {
          select: {
            id: true,
            channel: true,
            externalThreadId: true,
            title: true,
            lastInboundAt: true,
            lastOutboundAt: true,
          },
        },
      },
    }),
    prisma.agent.findMany({
      where: {
        ownerType: "matt_internal",
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        agentKind: true,
        status: true,
      },
    }),
    prisma.agent.findMany({
      where: {
        ownerType: "matt_internal",
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        agentKind: true,
        status: true,
        activationStatus: true,
        transportProvider: true,
        cortexId: true,
        workerTier: true,
        updatedAt: true,
        useCaseTemplate: {
          select: {
            slug: true,
            name: true,
          },
        },
        loadoutItems: {
          orderBy: [{ createdAt: "asc" }],
          take: 4,
          select: {
            id: true,
            state: true,
            catalogItem: {
              select: {
                slug: true,
                name: true,
                itemType: true,
              },
            },
          },
        },
        skillBindings: {
          orderBy: [{ createdAt: "asc" }],
          take: 4,
          select: {
            id: true,
            status: true,
            skillDefinition: {
              select: {
                slug: true,
                name: true,
                capabilityType: true,
              },
            },
            defaultImplementation: {
              select: {
                implementationKey: true,
                qualityTier: true,
                runtimeEngine: true,
              },
            },
          },
        },
        entitlementPackGrants: {
          where: {
            status: "active",
          },
          orderBy: [{ startsAt: "desc" }],
          take: 3,
          select: {
            id: true,
            status: true,
            startsAt: true,
            endsAt: true,
            entitlementPack: {
              select: {
                slug: true,
                name: true,
                grantType: true,
                resetPolicy: true,
              },
            },
            allowances: {
              orderBy: [{ createdAt: "asc" }],
              take: 4,
              select: {
                meterKey: true,
                remainingUnits: true,
                consumedUnits: true,
                skillDefinition: {
                  select: {
                    slug: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            loadoutItems: true,
            skillBindings: true,
            entitlementPackGrants: true,
            assignedFleetTasks: true,
            outboundTransportMessages: true,
          },
        },
      },
    }),
    prisma.payment.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        sessionId: true,
        provider: true,
        paymentMethodType: true,
        amount: true,
        currency: true,
        status: true,
        paymentPurpose: true,
        targetType: true,
        targetId: true,
        userId: true,
        createdAt: true,
        confirmedAt: true,
        expiresAt: true,
      },
    }),
    prisma.deployJob.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        type: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        errorCode: true,
        errorMessage: true,
        nextRunAt: true,
        lastAttemptAt: true,
        createdAt: true,
        agent: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            activationStatus: true,
            deployState: true,
          },
        },
      },
    }),
    prisma.workspace.findMany({
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        kind: true,
        metadata: true,
        updatedAt: true,
        ownerUser: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        memberships: {
          orderBy: [{ createdAt: "asc" }],
          take: 1,
          select: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ] as const);

  const integrationWorkspaces = integrationWorkspacesRaw
    .map((workspace) => {
      const metadata =
        workspace.metadata && typeof workspace.metadata === "object" && !Array.isArray(workspace.metadata)
          ? (workspace.metadata as Record<string, unknown>)
          : {};
      const readiness = evaluateWorkspaceIntegrationReadinessFromStates({
        composio:
          metadata.composio && typeof metadata.composio === "object" && !Array.isArray(metadata.composio)
            ? (metadata.composio as WorkspaceComposioState)
            : ({} as WorkspaceComposioState),
        sesh:
          metadata.sesh && typeof metadata.sesh === "object" && !Array.isArray(metadata.sesh)
            ? (metadata.sesh as WorkspaceSeshState)
            : ({} as WorkspaceSeshState),
      });

      return {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        kind: workspace.kind,
        updatedAt: workspace.updatedAt,
        owner:
          workspace.ownerUser ??
          workspace.memberships[0]?.user ??
          null,
        readiness,
      };
    })
    .filter((workspace) => {
      return (
        workspace.readiness.overallStatus !== "not_configured" ||
        workspace.readiness.warnings.length > 0 ||
        workspace.readiness.blockingIssues.length > 0
      );
    });

  const integrationMetrics = {
    composioReadyCount: integrationWorkspaces.filter(
      (workspace) => workspace.readiness.composio.status === "ready",
    ).length,
    composioDegradedCount: integrationWorkspaces.filter(
      (workspace) => workspace.readiness.composio.status === "degraded",
    ).length,
    whatsappReadyCount: integrationWorkspaces.filter(
      (workspace) => workspace.readiness.whatsapp.status === "ready",
    ).length,
    whatsappDegradedCount: integrationWorkspaces.filter(
      (workspace) => workspace.readiness.whatsapp.status === "degraded",
    ).length,
    fallbackUsedLast24h: integrationWorkspaces.reduce(
      (sum, workspace) => sum + workspace.readiness.composio.fallbackCount24h,
      0,
    ),
    failedWebhookEventsLast24h: integrationWorkspaces.reduce(
      (sum, workspace) => sum + workspace.readiness.whatsapp.failedWebhookEvents24h,
      0,
    ),
  };

  return {
    generatedAt,
    envChecks,
    metrics: {
      activeRelationships,
      openTickets,
      activeTasks,
      pendingOutbound,
      pendingPayments,
      activeDeployJobs,
      telethonIdentityCount,
      activeBindingCount,
      mattAgentCount,
    },
    relationships,
    tickets,
    tasks,
    threads,
    telethonIdentities,
    outboundMessages,
    threadBindings,
    mattAgentOptions,
    mattAgents,
    recentPayments,
    deployJobs,
    integrationMetrics,
    integrationWorkspaces,
  };
}
