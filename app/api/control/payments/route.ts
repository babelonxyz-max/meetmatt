import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/control/payments - List all payments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    // Get user info for each payment
    const userIds = [...new Set(payments.map(p => p.userId).filter((id): id is string => !!id))];
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    }) : [];
    const userMap = users.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {} as Record<string, any>);

    const paymentsWithUsers = payments.map(p => ({
      ...p,
      user: p.userId ? userMap[p.userId] : null,
    }));

    return NextResponse.json({
      payments: paymentsWithUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[Control] List payments error:", error);
    return NextResponse.json(
      { error: "Failed to list payments" },
      { status: 500 }
    );
  }
}
