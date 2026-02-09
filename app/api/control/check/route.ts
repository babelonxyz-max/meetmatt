import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/app/control/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("control_session");
    const session = sessionCookie ? JSON.parse(sessionCookie.value) : null;

    if (!verifySession(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("[Control Check] Error:", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
