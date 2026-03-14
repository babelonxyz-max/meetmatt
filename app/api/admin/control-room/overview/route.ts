import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/http-error";
import { requireAdminApiRequest } from "@/lib/admin-api-auth";
import { getOpsDashboardData } from "@/lib/ops-dashboard";

export async function GET(request: NextRequest) {
  const authError = await requireAdminApiRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const data = await getOpsDashboardData();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("[Admin/ControlRoom/Overview] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
