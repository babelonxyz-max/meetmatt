import { NextRequest, NextResponse } from "next/server";

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

// GET /api/payment/estimate?amount=150&currency=usdt
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const amount = searchParams.get("amount");
    const currency = searchParams.get("currency") || "usdt";

    if (!amount) {
      return NextResponse.json(
        { error: "Amount is required" },
        { status: 400 }
      );
    }

    if (!NOWPAYMENTS_API_KEY) {
      // Return mock estimate if no API key
      return NextResponse.json({
        estimated_amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        exchange_rate: 1,
        mock: true,
      });
    }

    // Call NowPayments estimate endpoint
    const response = await fetch(
      `${NOWPAYMENTS_API_URL}/estimate?amount=${amount}&currency_from=usd&currency_to=${currency.toLowerCase()}`,
      {
        headers: {
          "x-api-key": NOWPAYMENTS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Payment/Estimate] NowPayments error:", {
        status: response.status,
        body: errorText,
      });
      
      let errorMessage = "Failed to get estimate";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      estimated_amount: data.estimated_amount,
      currency: data.currency_to,
      exchange_rate: data.exchange_rate,
      estimated_time: data.estimated_time,
    });

  } catch (error: any) {
    console.error("[Payment/Estimate] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get estimate" },
      { status: 500 }
    );
  }
}

// POST /api/payment/estimate - Get estimate for subscription extension
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency = "usdt" } = body;

    if (!amount) {
      return NextResponse.json(
        { error: "Amount is required" },
        { status: 400 }
      );
    }

    if (!NOWPAYMENTS_API_KEY) {
      return NextResponse.json({
        estimated_amount: amount,
        currency: currency.toUpperCase(),
        exchange_rate: 1,
        mock: true,
      });
    }

    const response = await fetch(
      `${NOWPAYMENTS_API_URL}/estimate?amount=${amount}&currency_from=usd&currency_to=${currency.toLowerCase()}`,
      {
        headers: {
          "x-api-key": NOWPAYMENTS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Payment/Estimate] NowPayments error:", {
        status: response.status,
        body: errorText,
      });
      
      let errorMessage = "Failed to get estimate";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      estimated_amount: data.estimated_amount,
      currency: data.currency_to,
      exchange_rate: data.exchange_rate,
      estimated_time: data.estimated_time,
    });

  } catch (error: any) {
    console.error("[Payment/Estimate] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get estimate" },
      { status: 500 }
    );
  }
}
