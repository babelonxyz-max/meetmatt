import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId required" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.userId !== userId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      address: payment.address,
      confirmedAt: payment.confirmedAt,
    });

  } catch (error: any) {
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Payment/Status] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
