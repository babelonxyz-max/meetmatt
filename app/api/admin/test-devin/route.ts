import { NextRequest, NextResponse } from "next/server";

const DEVIN_API_URL = "https://api.devin.ai/v1";
// Hardcoded for testing - will use env var once confirmed working
const DEVIN_API_KEY = "apk_user_ZW1haWx8Njk3N2U1NDg2ODE4NGFiNzA4MWM0MTE1X29yZy04NzRkYzAzMGQyOTI0Mjc1YmI2ZGIzYWU2NzdhYmQ0Nzo3NTQ0YTkxZDM2OWE0NjY3OTY3MmNlYWRlNDVjOWMxYg==";
const ADMIN_TOKEN = "ddec17a6bb0809ae085b65653292cf5bbf7a02eabb1d86f671b44f8d16fef7c4";

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return !!authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Try v1 endpoint with hardcoded key
    const response = await fetch(`${DEVIN_API_URL}/sessions`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${DEVIN_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json({
        status: "error",
        message: "Devin API returned error",
        apiStatus: response.status,
        apiError: error,
        keyPreview: DEVIN_API_KEY.substring(0, 20) + "...",
      });
    }

    const data = await response.json();
    
    return NextResponse.json({
      status: "ok",
      message: "37787 - Devin connection successful!",
      keyPreview: DEVIN_API_KEY.substring(0, 20) + "...",
      apiStatus: response.status,
      sessions: data.sessions?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { message } = body;

    // Create test session
    const response = await fetch(`${DEVIN_API_URL}/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEVIN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: message || "37787 - Connection test. Please acknowledge receipt of this message.",
        name: "37787 Test",
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json({
        error: "Failed to create session",
        status: response.status,
        details: error,
      }, { status: 400 });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "37787 - Test session created!",
      sessionId: data.session_id,
      url: data.url,
      status: data.status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
