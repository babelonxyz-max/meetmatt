import { NextRequest, NextResponse } from "next/server";
import { getStatusError } from "@/lib/http-error";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { smokeTestWorkspaceWhatsAppOutbound } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    requireAdminOrInternal(request);
    const body = (await request.json()) as Record<string, unknown>;

    const workspaceId =
      typeof body.workspaceId === "string" ? body.workspaceId.trim() : "";
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!workspaceId || !to || !text) {
      return NextResponse.json(
        { error: "workspaceId, to, and text are required" },
        { status: 400 },
      );
    }

    const result = await smokeTestWorkspaceWhatsAppOutbound({
      workspaceId,
      to,
      text,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Workspace/WhatsApp/SmokeTest] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
