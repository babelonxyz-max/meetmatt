import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAgentTelegramLaunchState } from "@/lib/agent-telegram";
import { requireAuth } from "@/lib/auth";
import { getStatusError } from "@/lib/http-error";
import { OWNER_TYPE } from "@/lib/agent-blueprint";
import { getWorkspaceComposioState } from "@/lib/composio";
import { ensureMattRelationshipPack } from "@/lib/matt-relationships";
import { getWorkspaceSeshState } from "@/lib/sesh";
import { evaluateWorkspaceIntegrationReadinessFromStates } from "@/lib/workspace-integrations";

export async function GET(request: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth(request);
    const matt = await ensureMattRelationshipPack({ userId, workspaceId });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update last login
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    const agents = await prisma.agent.findMany({
      where: {
        ownerType: OWNER_TYPE.customer,
        OR: [
          { workspaceId },
          {
            workspaceId: null,
            userId,
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const [payments, openTickets] = await Promise.all([
      prisma.payment.findMany({
        where: {
          OR: [
            { workspaceId },
            {
              workspaceId: null,
              userId,
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.supportTicket.findMany({
        where: {
          OR: [
            { workspaceId },
            {
              workspaceId: null,
              userId,
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const telegramLaunchStates = await Promise.all(
      agents.map((agent) => getAgentTelegramLaunchState(agent.id)),
    );
    const [seshState, composioState] = await Promise.all([
      getWorkspaceSeshState(workspaceId),
      getWorkspaceComposioState(workspaceId),
    ]);
    const integrationReadiness = evaluateWorkspaceIntegrationReadinessFromStates({
      sesh: seshState,
      composio: composioState,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        name: user.name,
        createdAt: user.createdAt,
      },
      workspace: {
        id: workspaceId,
        name: matt.workspace.name,
        kind: matt.workspace.kind,
        integrations: {
          whatsapp: {
            connected: integrationReadiness.whatsapp.connected,
            provider: seshState.whatsapp?.provider ?? null,
            endpointUrl: seshState.whatsapp?.endpointUrl ?? null,
            phoneNumberId: seshState.whatsapp?.phoneNumberId ?? null,
            readiness: integrationReadiness.whatsapp.status,
            webhookReady: integrationReadiness.whatsapp.webhookReady,
            inboundReady: integrationReadiness.whatsapp.inboundReady,
            outboundReady: integrationReadiness.whatsapp.outboundReady,
            lastInboundAt: integrationReadiness.whatsapp.lastInboundAt,
            lastOutboundAt: integrationReadiness.whatsapp.lastOutboundAt,
            lastError: integrationReadiness.whatsapp.lastError,
            failedWebhookEvents24h: integrationReadiness.whatsapp.failedWebhookEvents24h,
            warnings: integrationReadiness.whatsapp.warnings,
            blockingIssues: integrationReadiness.whatsapp.blockingIssues,
          },
          composio: {
            enabled: composioState.enabled ?? false,
            mode: composioState.mode ?? null,
            sessionId: composioState.sessionId ?? null,
            connectedProviderCount: composioState.connectedProviderCount ?? 0,
            connectedProviders: composioState.connectedProviders ?? [],
            readiness: integrationReadiness.composio.status,
            lastValidatedAt: integrationReadiness.composio.lastValidatedAt,
            lastError: integrationReadiness.composio.lastError,
            lastProviderUsed: integrationReadiness.composio.lastProviderUsed,
            fallbackCount24h: integrationReadiness.composio.fallbackCount24h,
            warnings: integrationReadiness.composio.warnings,
            blockingIssues: integrationReadiness.composio.blockingIssues,
          },
          overallStatus: integrationReadiness.overallStatus,
          warnings: integrationReadiness.warnings,
          blockingIssues: integrationReadiness.blockingIssues,
        },
      },
      matt: {
        accountManager: {
          relationshipId: matt.accountManager.id,
          status: matt.accountManager.status,
          channel: matt.accountManager.primaryChannel,
          agent: {
            id: matt.accountManager.assignedAgent.id,
            name: matt.accountManager.assignedAgent.name,
            agentKind: matt.accountManager.assignedAgent.agentKind,
            transportProvider: matt.accountManager.assignedAgent.transportProvider,
            cortexId: matt.accountManager.assignedAgent.cortexId,
            status: matt.accountManager.assignedAgent.status,
          },
        },
        support: {
          relationshipId: matt.support.id,
          status: matt.support.status,
          channel: matt.support.primaryChannel,
          agent: {
            id: matt.support.assignedAgent.id,
            name: matt.support.assignedAgent.name,
            agentKind: matt.support.assignedAgent.agentKind,
            transportProvider: matt.support.assignedAgent.transportProvider,
            cortexId: matt.support.assignedAgent.cortexId,
            status: matt.support.assignedAgent.status,
          },
        },
      },
      agents: agents.map((agent, index) => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        deployState: agent.deployState,
        ownerType: agent.ownerType,
        agentKind: agent.agentKind,
        productUseCase: agent.productUseCase,
        useCaseTemplateId: agent.useCaseTemplateId,
        workerTier: agent.workerTier,
        loadoutVersion: agent.loadoutVersion,
        transportProvider: agent.transportProvider,
        brainProvider: agent.brainProvider,
        deploymentProvider: agent.deploymentProvider,
        runtimeProvider: agent.runtimeProvider,
        runtimeUrl: agent.runtimeUrl,
        deployErrorCode: agent.deployErrorCode,
        deployErrorMessage: agent.deployErrorMessage,
        subscriptionStatus: agent.subscriptionStatus,
        subscriptionType: agent.subscriptionType,
        currentPeriodEnd: agent.currentPeriodEnd,
        cancelAtPeriodEnd: agent.cancelAtPeriodEnd,
        devinUrl: agent.devinUrl,
        activationStatus: agent.activationStatus,
        botAssigned: telegramLaunchStates[index]?.botAssigned ?? false,
        primaryTelegramIdentityId:
          telegramLaunchStates[index]?.primaryTelegramIdentityId ?? null,
        botOwnershipType: telegramLaunchStates[index]?.botOwnershipType ?? null,
        telegramProvisioningMode:
          telegramLaunchStates[index]?.telegramProvisioningMode ?? null,
        botUsername: telegramLaunchStates[index]?.botUsername ?? agent.botUsername,
        telegramLink: telegramLaunchStates[index]?.telegramLink ?? agent.telegramLink,
        createdAt: agent.createdAt,
      })),
      payments: payments.map(p => ({
        id: p.id,
        provider: p.provider,
        paymentMethodType: p.paymentMethodType,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
      })),
      openTickets: openTickets.map(ticket => ({
        id: ticket.id,
        status: ticket.status,
        priority: ticket.priority,
        subject: ticket.subject,
        createdAt: ticket.createdAt,
      })),
      stats: {
        totalAgents: agents.length,
        activeSubscriptions: agents.filter(a => a.subscriptionStatus === "active").length,
        expired: agents.filter(a => a.subscriptionStatus === "expired").length,
        inTrial: agents.filter(a => a.subscriptionStatus === "trial" || a.subscriptionType === "day_pass").length,
        openSupportTickets: openTickets.filter(ticket =>
          ticket.status === "open" ||
          ticket.status === "pending_user" ||
          ticket.status === "escalated"
        ).length,
      },
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("[User/Me] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
