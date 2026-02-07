import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_AUTH_TOKEN || "ddec17a6bb0809ae085b65653292cf5bbf7a02eabb1d86f671b44f8d16fef7c4";

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  return !!authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`;
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.DEVIN_API_KEY || "";
  
  // Check key format
  const isServiceUserFormat = key.startsWith("cog_");
  const isLegacyFormat = key.startsWith("devin-");
  
  return NextResponse.json({
    keyConfigured: !!key,
    keyLength: key.length,
    keyPrefix: key.substring(0, 20) + "...",
    isServiceUserFormat,
    isLegacyFormat,
    note: "Devin Service User keys start with 'cog_'. Legacy API keys start with 'devin-'. Both use Bearer auth.",
    docs: "https://docs.devin.ai/",
  });
}

// Test with different auth formats
export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.DEVIN_API_KEY || "";
  const results: any[] = [];

  // Test 1: Bearer with cog_ key (current)
  try {
    const r1 = await fetch("https://api.devin.ai/v1/sessions", {
      method: "GET",
      headers: { "Authorization": `Bearer ${key}` },
    });
    results.push({ method: "Bearer cog_", status: r1.status, ok: r1.ok });
  } catch (e: any) {
    results.push({ method: "Bearer cog_", error: e.message });
  }

  // Test 2: Try organization format (some service users need this)
  try {
    const r2 = await fetch("https://api.devin.ai/v1/sessions", {
      method: "GET",
      headers: { 
        "Authorization": `Bearer ${key}`,
        "X-Devin-Organization": "default",
      },
    });
    results.push({ method: "Bearer + Org header", status: r2.status, ok: r2.ok });
  } catch (e: any) {
    results.push({ method: "Bearer + Org header", error: e.message });
  }

  return NextResponse.json({ results });
}
