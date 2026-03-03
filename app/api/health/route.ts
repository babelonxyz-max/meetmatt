import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/prisma";

const startTime = Date.now();

export async function GET() {
  const dbOk = await checkDatabaseConnection();

  return NextResponse.json({
    status: dbOk ? "ok" : "degraded",
    db: dbOk,
    uptime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }, {
    status: dbOk ? 200 : 503,
  });
}
