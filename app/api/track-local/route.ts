import { NextRequest, NextResponse } from "next/server";
import { appendFile } from "fs/promises";
import { existsSync } from "fs";

const LOG_FILE = "./logs/tracking.log";
const EVENTS_FILE = "./logs/events.jsonl";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, properties, sessionId } = body;
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${event} | ${JSON.stringify(properties)} | session: ${sessionId || 'unknown'}\n`;
    const jsonEntry = JSON.stringify({ timestamp, event, properties, sessionId }) + "\n";
    
    // Write to log file
    await appendFile(LOG_FILE, logEntry);
    await appendFile(EVENTS_FILE, jsonEntry);
    
    // Also log to console for real-time viewing
    console.log("[TRACK]", event, properties);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Track] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lines = parseInt(searchParams.get("lines") || "50");
    
    const { execSync } = require("child_process");
    let output = "";
    
    if (existsSync(LOG_FILE)) {
      output = execSync(`tail -${lines} ${LOG_FILE}`, { encoding: "utf-8" });
    }
    
    return NextResponse.json({ 
      logs: output.split("\n").filter(Boolean),
      raw: output 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
