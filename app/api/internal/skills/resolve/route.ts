import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrInternal } from "@/lib/internal-auth";
import { getStatusError } from "@/lib/http-error";
import {
  reserveSkillUsageForAgent,
  resolveSkillExecutionForAgent,
} from "@/lib/capability-commerce/usage";

export async function POST(req: NextRequest) {
  try {
    requireAdminOrInternal(req);
    const body = (await req.json()) as Record<string, unknown>;
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
    const skillSlug = typeof body.skillSlug === "string" ? body.skillSlug.trim() : "";
    const reserve =
      typeof body.reserve === "boolean" ? body.reserve : false;
    const units =
      typeof body.units === "number" && Number.isFinite(body.units) && body.units > 0
        ? Math.floor(body.units)
        : 1;

    if (!agentId || !skillSlug) {
      return NextResponse.json(
        { error: "agentId and skillSlug are required" },
        { status: 400 },
      );
    }

    const resolution = reserve
      ? await reserveSkillUsageForAgent({ agentId, skillSlug, units })
      : await resolveSkillExecutionForAgent({ agentId, skillSlug, units });

    return NextResponse.json({ resolution });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }

    console.error("[Internal/Skills/Resolve] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
