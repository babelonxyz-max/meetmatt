import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const event = searchParams.get("event");
    const hours = parseInt(searchParams.get("hours") || "24");
    
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get name input events
    const nameInputs = await prisma.analyticsEvent.findMany({
      where: {
        event: "input_changed",
        properties: { path: ["field"], equals: "agent_name" },
        timestamp: { gte: since },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    // Get submitted names
    const submittedNames = await prisma.analyticsEvent.findMany({
      where: {
        event: "agent_name_submitted",
        timestamp: { gte: since },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    // Get flow stats
    const stats = await prisma.$transaction([
      prisma.analyticsEvent.count({
        where: { event: "flow_started", timestamp: { gte: since } },
      }),
      prisma.analyticsEvent.count({
        where: { event: "agent_name_submitted", timestamp: { gte: since } },
      }),
      prisma.analyticsEvent.count({
        where: { event: "payment_started", timestamp: { gte: since } },
      }),
      prisma.analyticsEvent.count({
        where: { event: "payment_completed", timestamp: { gte: since } },
      }),
    ]);

    return NextResponse.json({
      hours,
      funnel: {
        started: stats[0],
        named: stats[1],
        paymentStarted: stats[2],
        paymentCompleted: stats[3],
      },
      nameInputs: nameInputs.map(e => ({
        id: e.id,
        value: (e.properties as any)?.value,
        length: (e.properties as any)?.valueLength,
        timestamp: e.timestamp,
        sessionId: e.sessionId,
        user: e.user,
      })),
      submittedNames: submittedNames.map(e => ({
        id: e.id,
        name: (e.properties as any)?.name,
        length: (e.properties as any)?.nameLength,
        authenticated: (e.properties as any)?.authenticated,
        timestamp: e.timestamp,
        sessionId: e.sessionId,
        user: e.user,
      })),
    });
  } catch (error: any) {
    console.error("[Admin/Analytics] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
