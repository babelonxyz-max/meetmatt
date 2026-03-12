import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getStatusError } from "@/lib/http-error";
import { getWorkspaceSeshState } from "@/lib/sesh";
import {
  connectWorkspaceWhatsAppChannel,
  getWorkspaceWhatsAppReadiness,
} from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
  try {
    const { workspaceId } = await requireAuth(request);
    const [sesh, readiness] = await Promise.all([
      getWorkspaceSeshState(workspaceId),
      getWorkspaceWhatsAppReadiness(workspaceId),
    ]);

    return NextResponse.json({
      workspaceId,
      whatsapp: sesh.whatsapp ?? null,
      webhook: sesh.webhooks?.whatsapp ?? null,
      readiness,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Workspace/Integrations/WhatsApp] GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth(request);
    const body = (await request.json()) as Record<string, unknown>;

    const accessToken =
      typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    const phoneNumberId =
      typeof body.phoneNumberId === "string" ? body.phoneNumberId.trim() : "";

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: "accessToken and phoneNumberId are required" },
        { status: 400 },
      );
    }

    const connection = await connectWorkspaceWhatsAppChannel({
      workspaceId,
      configuredByUserId: userId,
      accessToken,
      phoneNumberId,
      businessAccountId:
        typeof body.businessAccountId === "string"
          ? body.businessAccountId.trim()
          : null,
      webhookSecret:
        typeof body.webhookSecret === "string"
          ? body.webhookSecret.trim()
          : null,
      verifyToken:
        typeof body.verifyToken === "string" ? body.verifyToken.trim() : null,
      defaultRole:
        body.defaultRole === "account_manager" ? "account_manager" : "support",
    });

    return NextResponse.json({
      ok: true,
      workspaceId,
      connection,
      readiness: await getWorkspaceWhatsAppReadiness(workspaceId),
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Workspace/Integrations/WhatsApp] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
