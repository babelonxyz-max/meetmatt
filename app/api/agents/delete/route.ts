import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getErrorMessage, getStatusError } from "@/lib/http-error";

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("id");

    if (!agentId) {
      return NextResponse.json({ error: "Agent id required" }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent || agent.userId !== userId) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Soft-delete: preserve payment records, just mark as deleted
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "deleted" },
    });

    console.log("[Delete] Agent soft-deleted:", agentId);

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("[Delete] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 }
    );
  }
}
