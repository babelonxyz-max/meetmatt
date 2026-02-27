/**
 * Fleet Scale API - Visual/Placeholder Version
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  
  return NextResponse.json({
    success: true,
    data: {
      fleetId: params.id,
      status: "scaling",
      message: `Scaling to ${body.targetCount} agents (DEMO MODE)`,
      progress: {
        total: body.targetCount,
        completed: Math.floor(body.targetCount * 0.8),
        failed: 0,
        pending: Math.floor(body.targetCount * 0.2),
      },
    },
  });
}
