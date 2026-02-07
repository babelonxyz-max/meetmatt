import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface TrackEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "Invalid events" }, { status: 400 });
    }

    // Store events in database
    const stored = await Promise.all(
      events.map(async (event: TrackEvent) => {
        // Find user by privyId if provided
        let dbUserId: string | null = null;
        if (event.userId) {
          const user = await prisma.user.findUnique({
            where: { privyId: event.userId },
            select: { id: true },
          });
          if (user) dbUserId = user.id;
        }

        return prisma.analyticsEvent.create({
          data: {
            event: event.event,
            properties: event.properties || {},
            sessionId: event.sessionId,
            userId: dbUserId,
            timestamp: new Date(event.timestamp),
          },
        });
      })
    );

    return NextResponse.json({ 
      success: true, 
      tracked: stored.length 
    });
  } catch (error: any) {
    console.error("[Track] Error:", error);
    return NextResponse.json(
      { error: "Failed to track events" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve tracked events (for admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const event = searchParams.get("event");
    const limit = parseInt(searchParams.get("limit") || "100");
    const since = searchParams.get("since");

    const where: any = {};
    if (event) where.event = event;
    if (since) where.timestamp = { gte: new Date(since) };

    const events = await prisma.analyticsEvent.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    return NextResponse.json({ 
      events,
      count: events.length 
    });
  } catch (error: any) {
    console.error("[Track/Get] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
