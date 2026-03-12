import { NextRequest, NextResponse } from "next/server";
import {
  OPS_SESSION_COOKIE,
  createOpsSessionValue,
  getOpsSessionCookieOptions,
  isValidOpsAdminToken,
  sanitizeOpsNextPath,
} from "@/lib/ops-auth";

type SessionRequestPayload = {
  action: "login" | "logout";
  token: string;
  nextPath: string;
  wantsJson: boolean;
};

function clearOpsSessionCookie(response: NextResponse) {
  response.cookies.set({
    ...getOpsSessionCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
    name: OPS_SESSION_COOKIE,
    value: "",
  });
}

function setOpsSessionCookie(response: NextResponse, value: string) {
  response.cookies.set({
    ...getOpsSessionCookieOptions(),
    name: OPS_SESSION_COOKIE,
    value,
  });
}

async function readRequestPayload(req: NextRequest): Promise<SessionRequestPayload> {
  const contentType = req.headers.get("content-type") ?? "";
  const acceptHeader = req.headers.get("accept") ?? "";
  const wantsJson =
    contentType.includes("application/json") || acceptHeader.includes("application/json");

  if (contentType.includes("application/json")) {
    const body = (await req.json()) as Record<string, unknown>;

    return {
      action: body.action === "logout" ? "logout" : "login",
      token: typeof body.token === "string" ? body.token : "",
      nextPath:
        typeof body.next === "string"
          ? sanitizeOpsNextPath(body.next)
          : "/ops",
      wantsJson,
    };
  }

  const formData = await req.formData();

  return {
    action: formData.get("action") === "logout" ? "logout" : "login",
    token: String(formData.get("token") ?? ""),
    nextPath: sanitizeOpsNextPath(String(formData.get("next") ?? "/ops")),
    wantsJson,
  };
}

function buildLoginRedirect(req: NextRequest, nextPath: string, error?: string) {
  const loginUrl = new URL("/ops/login", req.url);
  if (error) {
    loginUrl.searchParams.set("error", error);
  }
  if (nextPath && nextPath !== "/ops") {
    loginUrl.searchParams.set("next", nextPath);
  }
  return loginUrl;
}

export async function POST(req: NextRequest) {
  const payload = await readRequestPayload(req);

  if (payload.action === "logout") {
    if (payload.wantsJson) {
      const response = NextResponse.json({ ok: true });
      clearOpsSessionCookie(response);
      return response;
    }

    const response = NextResponse.redirect(new URL("/ops/login", req.url));
    clearOpsSessionCookie(response);
    return response;
  }

  if (!process.env.ADMIN_AUTH_TOKEN?.trim()) {
    if (payload.wantsJson) {
      return NextResponse.json(
        { error: "ADMIN_AUTH_TOKEN is not configured" },
        { status: 500 },
      );
    }

    return NextResponse.redirect(buildLoginRedirect(req, payload.nextPath, "unconfigured"));
  }

  if (!isValidOpsAdminToken(payload.token)) {
    if (payload.wantsJson) {
      return NextResponse.json({ error: "Invalid admin token" }, { status: 401 });
    }

    return NextResponse.redirect(buildLoginRedirect(req, payload.nextPath, "invalid"));
  }

  const sessionValue = createOpsSessionValue();
  if (!sessionValue) {
    if (payload.wantsJson) {
      return NextResponse.json(
        { error: "Failed to create ops session" },
        { status: 500 },
      );
    }

    return NextResponse.redirect(buildLoginRedirect(req, payload.nextPath, "unconfigured"));
  }

  if (payload.wantsJson) {
    const response = NextResponse.json({
      ok: true,
      redirectTo: payload.nextPath,
    });
    setOpsSessionCookie(response, sessionValue);
    return response;
  }

  const response = NextResponse.redirect(new URL(payload.nextPath, req.url));
  setOpsSessionCookie(response, sessionValue);
  return response;
}
