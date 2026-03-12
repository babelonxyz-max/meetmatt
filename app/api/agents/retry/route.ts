import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage, getStatusError } from "@/lib/http-error";

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth(req);
    const body = await req.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (
      !agent ||
      (
        agent.workspaceId !== workspaceId &&
        !(agent.workspaceId === null && agent.userId === userId)
      )
    ) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Only allow retry if deployment failed
    if (agent.status !== "error" && agent.activationStatus !== "failed") {
      return NextResponse.json(
        { error: "Agent is not in a failed state" },
        { status: 400 }
      );
    }

    // Reset agent to pending state for re-deployment
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: "pending",
        activationStatus: "activating",
        deployState: "pending",
        deployErrorCode: null,
        deployErrorMessage: null,
      },
    });

    // Trigger deployment (same pattern as payment webhook)
    if (!process.env.INTERNAL_WEBHOOK_SECRET) {
      console.error("[Retry] INTERNAL_WEBHOOK_SECRET not set, cannot trigger deploy");
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          activationStatus: "failed",
          status: "error",
          deployState: "failed",
          deployErrorCode: "CONFIG_MISSING",
          deployErrorMessage: "INTERNAL_WEBHOOK_SECRET not set",
        },
      });
      return NextResponse.json(
        { error: "Deployment service not configured" },
        { status: 503 }
      );
    }

    const triggerUrl = new URL("/api/agents/trigger-deploy", req.url).toString();
    const triggerResponse = await fetch(triggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_WEBHOOK_SECRET,
      },
      body: JSON.stringify({ agentId }),
    });

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text().catch(() => "");
      console.error("[Retry] Deploy trigger failed:", triggerResponse.status, errorText);
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          activationStatus: "failed",
          status: "error",
          deployState: "failed",
          deployErrorCode: `HTTP_${triggerResponse.status}`,
          deployErrorMessage: errorText.slice(0, 500),
        },
      });
      return NextResponse.json(
        { error: "Failed to trigger deployment" },
        { status: 502 }
      );
    }

    const payload = await triggerResponse.json().catch(() => ({} as Record<string, unknown>));
    const queued = payload["queued"] === true;
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        deployState: queued ? "queued" : "provisioning",
      },
    });

    console.log("[Retry] Deploy triggered successfully for agent:", agentId);

    return NextResponse.json({
      success: true,
      message: "Deployment retry initiated",
    });

  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("[Retry] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}
