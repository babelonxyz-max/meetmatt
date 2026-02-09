import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/control/payments/[id] - Get payment details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Get user
    const user = payment.userId ? await prisma.user.findUnique({
      where: { id: payment.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    }) : null;

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { paymentId: id },
    });

    return NextResponse.json({
      payment,
      user,
      invoice,
    });
  } catch (error: any) {
    console.error("[Control] Get payment error:", error);
    return NextResponse.json(
      { error: "Failed to get payment" },
      { status: 500 }
    );
  }
}
