import { NextRequest, NextResponse } from "next/server";
import { getStatusError, getErrorMessage } from "@/lib/http-error";
import { requireAdminApiRequest } from "@/lib/admin-api-auth";
import { adminCreateWorkspace } from "@/lib/admin-platform";

export async function POST(request: NextRequest) {
  const authError = await requireAdminApiRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const memberUserIds = Array.isArray(body.memberUserIds)
      ? body.memberUserIds.filter((value): value is string => typeof value === "string")
      : [];

    const workspace = await adminCreateWorkspace({
      name: typeof body.name === "string" ? body.name : "",
      slug: typeof body.slug === "string" ? body.slug : null,
      kind: body.kind === "personal" ? "personal" : "company",
      ownerUserId: typeof body.ownerUserId === "string" ? body.ownerUserId : null,
      memberUserIds,
    });

    return NextResponse.json({ success: true, workspace });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Admin/Platform/Workspaces] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
