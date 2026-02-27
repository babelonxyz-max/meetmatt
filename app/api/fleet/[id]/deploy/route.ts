/**
 * Fleet Deploy API - Visual/Placeholder Version
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    success: true,
    data: {
      fleetId: params.id,
      status: "deploying",
      message: "Deployment started (DEMO MODE - Backend not configured)",
      estimatedTime: 300,
      progress: {
        total: 50,
        completed: 0,
        failed: 0,
        pending: 50,
      },
    },
  });
}
