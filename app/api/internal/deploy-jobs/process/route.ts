import { NextRequest, NextResponse } from "next/server";
import { processDeployJobs } from "@/lib/deploy-jobs";
import { safeCompare } from "@/lib/crypto-utils";
import { getErrorMessage } from "@/lib/http-error";

function parseLimit(raw: string | null | undefined): number {
  const parsed = Number.parseInt(raw || "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 10;
  }
  return Math.min(parsed, 50);
}

function isAuthorized(req: NextRequest): boolean {
  const internalSecret = req.headers.get("x-internal-secret");
  if (
    process.env.INTERNAL_WEBHOOK_SECRET &&
    safeCompare(internalSecret ?? "", process.env.INTERNAL_WEBHOOK_SECRET)
  ) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    safeCompare(authHeader ?? "", `Bearer ${process.env.CRON_SECRET}`)
  ) {
    return true;
  }

  return false;
}

async function run(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { limit?: number };
  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(body.limit ?? parseLimit(url.searchParams.get("limit")), 1),
    50,
  );

  const result = await processDeployJobs(limit);
  return NextResponse.json({
    success: true,
    ...result,
  });
}

export async function POST(req: NextRequest) {
  try {
    return await run(req);
  } catch (error: unknown) {
    console.error("[DeployJobs/Process] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    return await run(req);
  } catch (error: unknown) {
    console.error("[DeployJobs/Process] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
