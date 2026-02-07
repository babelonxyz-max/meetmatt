import { NextResponse } from "next/server";

const DEVIN_KEY = "apk_user_ZW1haWx8Njk3N2U1NDg2ODE4NGFiNzA4MWM0MTE1X29yZy04NzRkYzAzMGQyOTI0Mjc1YmI2ZGIzYWU2NzdhYmQ0Nzo3NTQ0YTkxZDM2OWE0NjY3OTY3MmNlYWRlNDVjOWMxYg==";

export async function GET() {
  try {
    const res = await fetch("https://api.devin.ai/v1/sessions", {
      headers: { "Authorization": `Bearer ${DEVIN_KEY}` },
    });
    
    if (!res.ok) {
      return NextResponse.json({ 
        status: "error", 
        code: res.status,
        preview: DEVIN_KEY.slice(0, 15)
      });
    }
    
    const data = await res.json();
    return NextResponse.json({
      status: "ok",
      message: "37787 - Connected!",
      sessions: data.sessions?.length || 0,
      preview: DEVIN_KEY.slice(0, 15),
    });
  } catch (e: any) {
    return NextResponse.json({ status: "fail", error: e.message });
  }
}
