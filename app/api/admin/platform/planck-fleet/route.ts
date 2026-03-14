import { NextRequest, NextResponse } from "next/server";
import { getStatusError, getErrorMessage } from "@/lib/http-error";
import { requireAdminApiRequest } from "@/lib/admin-api-auth";
import { adminProvisionPlanckHqFleet } from "@/lib/admin-platform";

export async function POST(request: NextRequest) {
  const authError = await requireAdminApiRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await adminProvisionPlanckHqFleet({
      userId: typeof body.userId === "string" ? body.userId : "",
      workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : null,
      identityStatus:
        typeof body.identityStatus === "string" ? body.identityStatus : null,
      identityOwnershipType:
        typeof body.identityOwnershipType === "string"
          ? body.identityOwnershipType
          : null,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Admin/Platform/PlanckFleet] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
