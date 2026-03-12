import { NextRequest, NextResponse } from "next/server";
import { UsageResult } from "@prisma/client";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import { finalizeReservedSkillUsage } from "@/lib/capability-commerce/usage";

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
    const reservation =
      body.reservation && typeof body.reservation === "object"
        ? body.reservation
        : null;

    if (!agentId || !reservation) {
      return NextResponse.json(
        { error: "agentId and reservation are required" },
        { status: 400 },
      );
    }

    const result =
      body.result === UsageResult.failed
        ? UsageResult.failed
        : body.result === UsageResult.partial
          ? UsageResult.partial
          : UsageResult.succeeded;

    await finalizeReservedSkillUsage({
      reservation: reservation as Parameters<typeof finalizeReservedSkillUsage>[0]["reservation"],
      agentId,
      userId:
        typeof body.userId === "string" && body.userId.trim().length > 0
          ? body.userId.trim()
          : null,
      runId:
        typeof body.runId === "string" && body.runId.trim().length > 0
          ? body.runId.trim()
          : null,
      units:
        typeof body.units === "number" && Number.isFinite(body.units)
          ? body.units
          : 1,
      unitType:
        typeof body.unitType === "string" && body.unitType.trim().length > 0
          ? body.unitType.trim()
          : "unit",
      costBasis:
        body.costBasis && typeof body.costBasis === "object"
          ? (body.costBasis as Parameters<typeof finalizeReservedSkillUsage>[0]["costBasis"])
          : undefined,
      result,
      refundOnFailure:
        typeof body.refundOnFailure === "boolean"
          ? body.refundOnFailure
          : true,
    });

    return NextResponse.json({ recorded: true });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Usage/Record] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
