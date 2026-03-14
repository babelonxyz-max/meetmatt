import { NextRequest, NextResponse } from "next/server";
import { getStatusError, getErrorMessage } from "@/lib/http-error";
import { requireAdminApiRequest } from "@/lib/admin-api-auth";
import { adminConfirmCustomerAgentWithoutPayment } from "@/lib/admin-platform";

type RouteContext = {
  params: Promise<{
    agentId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const authError = await requireAdminApiRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const { agentId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const result = await adminConfirmCustomerAgentWithoutPayment({
      agentId,
      launchPlan: body.launchPlan === "day_pass" ? "day_pass" : "monthly",
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Admin/Platform/ActivateCustomerAgent] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
