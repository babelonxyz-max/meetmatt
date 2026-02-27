/**
 * Fleet Status API - Visual/Placeholder Version
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({
    success: true,
    data: {
      fleetId: (await params).id,
      status: "running",
      message: "Fleet is running (DEMO MODE)",
      progress: {
        total: 50,
        completed: 45,
        failed: 2,
        pending: 3,
      },
    },
  });
}
