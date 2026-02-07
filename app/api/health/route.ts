import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET(req: NextRequest) {
  const checks: Record<string, { status: string; responseTime?: number; error?: string }> = {};
  let overallStatus = "healthy";
  
  // Check database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { 
      status: "ok", 
      responseTime: Date.now() - dbStart 
    };
  } catch (error: any) {
    checks.database = { 
      status: "error", 
      error: error.message 
    };
    overallStatus = "unhealthy";
  }
  
  // Check environment variables
  const requiredEnvVars = [
    "DATABASE_URL",
    "NEXT_PUBLIC_PRIVY_APP_ID",
  ];
  
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingEnvVars.length === 0) {
    checks.environment = { status: "ok" };
  } else {
    checks.environment = { 
      status: "warning", 
      error: `Missing: ${missingEnvVars.join(", ")}` 
    };
    if (overallStatus === "healthy") overallStatus = "degraded";
  }
  
  // Optional checks
  const optionalEnvVars = [
    "DEVIN_API_KEY",
    "NOWPAYMENTS_API_KEY",
  ];
  
  const missingOptional = optionalEnvVars.filter(v => !process.env[v]);
  checks.optionalServices = {
    status: missingOptional.length === 0 ? "ok" : "warning",
    ...(missingOptional.length > 0 && { 
      error: `Not configured: ${missingOptional.join(", ")}` 
    })
  };
  
  const statusCode = overallStatus === "healthy" ? 200 : 
                     overallStatus === "degraded" ? 200 : 503;
  
  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
    checks,
  }, { 
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    }
  });
}
