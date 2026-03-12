import { NextRequest, NextResponse } from "next/server";
import { processDeployJobs } from "@/lib/deploy-jobs";
import { getErrorMessage } from "@/lib/http-error";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const defaultLimitRaw = process.env.DEPLOY_JOBS_CRON_LIMIT || "20";
  const limitRaw = new URL(req.url).searchParams.get("limit");
  const parsed = Number.parseInt(limitRaw || defaultLimitRaw, 10);
  const limit = Number.isNaN(parsed) || parsed <= 0 ? 10 : Math.min(parsed, 50);

  try {
    const result = await processDeployJobs(limit);
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[Cron/DeployJobs] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
