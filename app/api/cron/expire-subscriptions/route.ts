import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { daysUntilExpiry } from "@/lib/subscription";
import { sendEmail, subscriptionExpiringEmail } from "@/lib/email";

/**
 * Vercel Cron endpoint — runs daily at 2:00 AM UTC.
 * 1. Expires agents whose currentPeriodEnd is in the past.
 * 2. Sends warning emails for agents expiring within 3 days.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sets Authorization header for cron jobs)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Find and expire all active agents past their period end
    const expiredAgents = await prisma.agent.findMany({
      where: {
        subscriptionStatus: "active",
        currentPeriodEnd: { lt: now },
      },
      select: { id: true, name: true },
    });

    if (expiredAgents.length > 0) {
      await prisma.agent.updateMany({
        where: {
          id: { in: expiredAgents.map((a) => a.id) },
        },
        data: {
          subscriptionStatus: "expired",
        },
      });

      console.log(
        "[Cron/Expire] Expired",
        expiredAgents.length,
        "agents:",
        expiredAgents.map((a) => a.name).join(", ")
      );
    }

    // 2. Find active agents expiring within 3 days and send warning emails
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const soonExpiringAgents = await prisma.agent.findMany({
      where: {
        subscriptionStatus: "active",
        currentPeriodEnd: {
          gt: now,
          lte: threeDaysFromNow,
        },
      },
      select: {
        id: true,
        name: true,
        currentPeriodEnd: true,
        userId: true,
      },
    });

    let warned = 0;

    for (const agent of soonExpiringAgents) {
      if (!agent.userId) continue;

      const user = await prisma.user.findUnique({
        where: { id: agent.userId },
        select: { email: true },
      });

      if (!user?.email) continue;

      const days = daysUntilExpiry(agent);
      if (days <= 0) continue;

      const { subject, html } = subscriptionExpiringEmail(agent.name, days);
      const result = await sendEmail(user.email, subject, html);

      if (result.success) {
        warned++;
        console.log("[Cron/Expire] Warning sent for agent:", agent.name, "days left:", days);
      }
    }

    return NextResponse.json({
      expired: expiredAgents.length,
      warned,
      timestamp: now.toISOString(),
    });
  } catch (error: unknown) {
    console.error("[Cron/Expire] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
