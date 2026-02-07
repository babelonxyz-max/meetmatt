import { NextRequest, NextResponse } from "next/server";

// In-memory store for real-time events
const events: Array<{ timestamp: string; event: string; data: any }> = [];
const clients: Set<(data: string) => void> = new Set();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;
    
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      data,
    };
    
    events.push(entry);
    
    // Keep only last 100 events
    if (events.length > 100) {
      events.shift();
    }
    
    // Broadcast to all connected clients
    const message = JSON.stringify(entry);
    clients.forEach((send) => {
      try {
        send(message);
      } catch (e) {
        clients.delete(send);
      }
    });
    
    // Also log to console
    console.log(`[MONITOR] \${event}:`, data);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stream = searchParams.get("stream");
    
    if (stream === "true") {
      // SSE endpoint for real-time updates
      const stream = new ReadableStream({
        start(controller) {
          const send = (data: string) => {
            try {
              controller.enqueue(new TextEncoder().encode(`data: \${data}\n\n`));
            } catch (e) {
              clients.delete(send);
            }
          };
          
          clients.add(send);
          
          // Send initial events
          events.slice(-20).forEach((event) => {
            send(JSON.stringify(event));
          });
          
          // Keep alive
          const interval = setInterval(() => {
            try {
              controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
            } catch (e) {
              clearInterval(interval);
              clients.delete(send);
            }
          }, 30000);
        },
      });
      
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }
    
    // Regular JSON endpoint
    return NextResponse.json({
      events: events.slice(-50),
      count: events.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
