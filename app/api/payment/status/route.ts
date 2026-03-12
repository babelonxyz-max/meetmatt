import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getStatusError } from "@/lib/http-error";

export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json({ error: "paymentId required" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (
      !payment ||
      (
        payment.workspaceId !== workspaceId &&
        !(payment.workspaceId === null && payment.userId === userId)
      )
    ) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: payment.id,
      provider: payment.provider,
      paymentMethodType: payment.paymentMethodType,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      address: payment.address,
      checkoutUrl: payment.checkoutUrl,
      confirmedAt: payment.confirmedAt,
      expiresAt: payment.expiresAt,
    });

  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("[Payment/Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
