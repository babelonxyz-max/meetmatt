import { NextRequest, NextResponse } from "next/server";
import { getStatusError } from "@/lib/http-error";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { provisionPlanckHqBotFleet } from "@/lib/planck-hq-bot-fleet";

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const userId =
      typeof body.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const result = await provisionPlanckHqBotFleet({
      userId,
      workspaceId:
        typeof body.workspaceId === "string" ? body.workspaceId.trim() : null,
      identityOwnershipType:
        typeof body.identityOwnershipType === "string"
          ? body.identityOwnershipType
          : null,
      identityStatus:
        typeof body.identityStatus === "string" ? body.identityStatus : null,
      seatCredentials:
        body.seatCredentials && typeof body.seatCredentials === "object"
          ? (body.seatCredentials as Record<string, unknown> as Record<
              string,
              {
                botToken?: string | null;
                session?: string | null;
                externalTelegramUsername?: string | null;
                externalTelegramUserId?: string | null;
                externalPhone?: string | null;
                runtimeLabel?: string | null;
                displayName?: string | null;
                status?: string | null;
              }
            >)
          : null,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json(
        { error: statusError.message },
        { status: statusError.status },
      );
    }

    console.error("[Internal/Planck/HQ Fleet] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
