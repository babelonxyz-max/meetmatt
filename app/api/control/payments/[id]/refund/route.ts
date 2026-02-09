import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/control/payments/[id]/refund - Process refund
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reason } = body;

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "confirmed") {
      return NextResponse.json(
        { error: "Can only refund confirmed payments" },
        { status: 400 }
      );
    }

    // Update payment status
    await prisma.payment.update({
      where: { id },
      data: {
        status: "refunded",
      },
    });

    // Update invoice if exists
    await prisma.invoice.updateMany({
      where: { paymentId: id },
      data: {
        status: "refunded",
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "payment_refunded",
        entityType: "payment",
        entityId: id,
        metadata: JSON.stringify({ 
          amount: payment.amount,
          currency: payment.currency,
          reason,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment marked as refunded",
    });
  } catch (error: any) {
    console.error("[Control] Refund error:", error);
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
