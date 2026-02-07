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
    // Check if API key is configured
    if (!DEVIN_API_KEY || DEVIN_API_KEY === "your-devin-api-key") {
      return NextResponse.json({
        status: "error",
        message: "DEVIN_API_KEY not configured",
        hasKey: false,
        keyPreview: null,
      });
    }

    // Try to list sessions (lightweight check)
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
        hasKey: true,
        keyPreview: DEVIN_API_KEY.substring(0, 10) + "...",
        apiStatus: response.status,
        apiError: error,
      });
    }

    const data = await response.json();
    
    return NextResponse.json({
      status: "ok",
      message: "Devin connection successful",
      hasKey: true,
      keyPreview: DEVIN_API_KEY.substring(0, 10) + "...",
      apiStatus: response.status,
      sessions: data.sessions?.length || 0,
      testMessage: "37787 - Connection verified",
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message,
      hasKey: !!DEVIN_API_KEY,
      keyPreview: DEVIN_API_KEY ? DEVIN_API_KEY.substring(0, 10) + "..." : null,
    }, { status: 500 });
  }
}

// POST to create a test session and send message
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!DEVIN_API_KEY || DEVIN_API_KEY === "your-devin-api-key") {
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
        body: JSON.stringify({ 
          message,
          // Service user requires specifying output format
          output_mode: "stream", 
        }),
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
        message: "Message sent to Devin",
        sessionId,
        sentMessage: message,
      });
    }

    // Create new test session with Service User format
    const response = await fetch(`${DEVIN_API_URL}/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEVIN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "37787 - Connection test. Please acknowledge.",
        name: "Test 37787",
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
      message: "Test session created",
      sessionId: data.session_id,
      url: data.url,
      status: data.status,
      note: "Check the Devin session URL to see if it responds with '37787 ACK'",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
