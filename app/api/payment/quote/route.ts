import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getStatusError } from "@/lib/http-error";
import { resolveUserLaunchPricing } from "@/lib/user-launch-pricing";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        monthlyLaunchFeeUsd: true,
        dayPassLaunchFeeUsd: true,
        monthlyLaunchFeeWaived: true,
        dayPassLaunchFeeWaived: true,
        billingNotes: true,
      },
    });
    const pricing = resolveUserLaunchPricing(user);

    return NextResponse.json({
      pricing: {
        ...pricing,
        billingNotes: user?.billingNotes ?? null,
      },
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json(
        { error: statusError.message },
        { status: statusError.status },
      );
    }

    console.error("[Payment/Quote] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
