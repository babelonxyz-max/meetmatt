import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateCoupon } from "@/lib/coupon";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const { code, planId, amount } = body;

    if (!code || !planId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await validateCoupon(
      code,
      session?.user?.id || "anonymous",
      planId,
      amount
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
