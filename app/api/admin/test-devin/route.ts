import { NextRequest, NextResponse } from "next/server";

const DEVIN_API_URL = "https://api.devin.ai/v1";
const DEVIN_API_KEY = "apk_user_ZW1haWx8Njk3N2U1NDg2ODE4NGFiNzA4MWM0MTE1X29yZy04NzRkYzAzMGQyOTI0Mjc1YmI2ZGIzYWU2NzdhYmQ0Nzo3NTQ0YTkxZDM2OWE0NjY3OTY3MmNlYWRlNDVjOWMxYg==";

export async function GET() {
  const keyPreview = DEVIN_API_KEY.substring(0, 20);
  
  try {
    const response = await fetch(`${DEVIN_API_URL}/sessions`, {
      headers: {
        "Authorization": `Bearer ${DEVIN_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json({
        status: "error",
        apiStatus: response.status,
        apiError: error,
        keyPreview,
      });
    }

    const data = await response.json();
    return NextResponse.json({
      status: "ok",
      message: "37787 - SUCCESS!",
      keyPreview,
      sessions: data.sessions?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "exception",
      message: error.message,
      keyPreview,
    }, { status: 500 });
  }
}
