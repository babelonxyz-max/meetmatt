import { NextRequest, NextResponse } from "next/server";

const DEVIN_API_URL = "https://api.devin.ai/v1";
const DEVIN_API_KEY = process.env.DEVIN_API_KEY || "";
const ADMIN_TOKEN = process.env.ADMIN_AUTH_TOKEN || "ddec17a6bb0809ae085b65653292cf5bbf7a02eabb1d86f671b44f8d16fef7c4";

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return !!authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!DEVIN_API_KEY) {
      return NextResponse.json({
        status: "error",
        message: "DEVIN_API_KEY not configured",
      });
    }

    // Try v1 endpoint with Personal API key
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
      });
    }

    const data = await response.json();
    
    return NextResponse.json({
      status: "ok",
      message: "37787 - Devin connection successful!",
      hasKey: true,
      apiStatus: response.status,
      sessions: data.sessions?.length || 0,
      recentSessions: data.sessions?.slice(0, 3).map((s: any) => ({
        id: s.session_id,
        title: s.title,
        status: s.status,
      })),
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
    if (!DEVIN_API_KEY) {
      return NextResponse.json({ error: "DEVIN_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { sessionId, message } = body;

    if (sessionId && message) {
      // Send message to existing session
      const response = await fetch(`${DEVIN_API_URL}/sessions/${sessionId}/message`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${DEVIN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        return NextResponse.json({
          error: "Failed to send message",
          status: response.status,
          details: error,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: "37787 - Message sent to Devin",
        sessionId,
        sentMessage: message,
      });
    }

    // Create new test session
    const response = await fetch(`${DEVIN_API_URL}/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEVIN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "37787 - Connection test. Please acknowledge receipt of this message.",
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
      note: "Check Devin dashboard to see the session",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
