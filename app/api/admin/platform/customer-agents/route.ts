import { NextRequest, NextResponse } from "next/server";
import { getStatusError, getErrorMessage } from "@/lib/http-error";
import { requireAdminApiRequest } from "@/lib/admin-api-auth";
import { adminCreateCustomerAgent } from "@/lib/admin-platform";

export async function POST(request: NextRequest) {
  const authError = await requireAdminApiRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await adminCreateCustomerAgent({
      userId: typeof body.userId === "string" ? body.userId : "",
      workspaceId: typeof body.workspaceId === "string" ? body.workspaceId : null,
      agentName: typeof body.agentName === "string" ? body.agentName : "",
      personality: typeof body.personality === "string" ? body.personality : "",
      useCase: body.useCase === "fleet" ? "fleet" : "assistant",
      useCaseSlug: typeof body.useCaseSlug === "string" ? body.useCaseSlug : null,
      telegramBotToken:
        typeof body.telegramBotToken === "string" ? body.telegramBotToken : "",
      launchPlan: body.launchPlan === "day_pass" ? "day_pass" : "monthly",
      activateWithoutPayment: body.activateWithoutPayment === true,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Admin/Platform/CustomerAgents] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
