import { NextRequest, NextResponse } from "next/server";
import { getStatusError, getErrorMessage } from "@/lib/http-error";
import { requireAdminApiRequest } from "@/lib/admin-api-auth";
import {
  adminUpdateUserBilling,
  parseOptionalUsdValue,
} from "@/lib/admin-platform";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authError = await requireAdminApiRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const { userId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const updatedUser = await adminUpdateUserBilling({
      userId,
      monthlyLaunchFeeUsd: body.monthlyLaunchFeeUsd === undefined
        ? undefined
        : parseOptionalUsdValue(
            body.monthlyLaunchFeeUsd == null ? null : String(body.monthlyLaunchFeeUsd),
          ),
      dayPassLaunchFeeUsd: body.dayPassLaunchFeeUsd === undefined
        ? undefined
        : parseOptionalUsdValue(
            body.dayPassLaunchFeeUsd == null ? null : String(body.dayPassLaunchFeeUsd),
          ),
      monthlyLaunchFeeWaived:
        typeof body.monthlyLaunchFeeWaived === "boolean"
          ? body.monthlyLaunchFeeWaived
          : undefined,
      dayPassLaunchFeeWaived:
        typeof body.dayPassLaunchFeeWaived === "boolean"
          ? body.dayPassLaunchFeeWaived
          : undefined,
      billingNotes:
        body.billingNotes === undefined
          ? undefined
          : body.billingNotes == null
            ? null
            : String(body.billingNotes),
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Admin/Platform/UserBilling] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
