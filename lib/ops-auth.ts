import "server-only";

import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeCompare } from "@/lib/crypto-utils";

const OPS_SESSION_SCOPE = "meetmatt-ops";
const OPS_SESSION_TTL_SECONDS = 60 * 60 * 12;

export const OPS_SESSION_COOKIE = "meetmatt_ops";

type OpsSessionPayload = {
  scope: typeof OPS_SESSION_SCOPE;
  exp: number;
};

function getOpsSigningSecret(): string {
  return process.env.ADMIN_AUTH_TOKEN?.trim() ?? "";
}

function encodePayload(payload: OpsSessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): OpsSessionPayload | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const payload = JSON.parse(decoded) as Partial<OpsSessionPayload>;

    if (
      payload.scope !== OPS_SESSION_SCOPE ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp)
    ) {
      return null;
    }

    return {
      scope: OPS_SESSION_SCOPE,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

function signPayload(encodedPayload: string): string {
  const secret = getOpsSigningSecret();
  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function isValidOpsAdminToken(token: string | null | undefined): boolean {
  const candidate = token?.trim() ?? "";
  const secret = getOpsSigningSecret();

  return Boolean(candidate && secret && safeCompare(candidate, secret));
}

export function createOpsSessionValue(now = Date.now()): string | null {
  if (!getOpsSigningSecret()) {
    return null;
  }

  const encodedPayload = encodePayload({
    scope: OPS_SESSION_SCOPE,
    exp: now + OPS_SESSION_TTL_SECONDS * 1000,
  });

  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyOpsSessionValue(
  value: string | null | undefined,
): OpsSessionPayload | null {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!expectedSignature || !safeCompare(signature, expectedSignature)) {
    return null;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload || payload.exp <= Date.now()) {
    return null;
  }

  return payload;
}

export function getOpsSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: OPS_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function sanitizeOpsNextPath(nextPath: string | null | undefined): string {
  const value = nextPath?.trim();

  if (!value || !value.startsWith("/ops")) {
    return "/ops";
  }

  if (value.startsWith("/ops/login")) {
    return "/ops";
  }

  return value;
}

export function getOpsSessionExpiryDate(payload: OpsSessionPayload): Date {
  return new Date(payload.exp);
}

export async function getOpsSession() {
  const cookieStore = await cookies();
  return verifyOpsSessionValue(cookieStore.get(OPS_SESSION_COOKIE)?.value);
}

export async function requireOpsSession(nextPath = "/ops") {
  const session = await getOpsSession();

  if (!session) {
    redirect(
      `/ops/login?next=${encodeURIComponent(sanitizeOpsNextPath(nextPath))}`,
    );
  }

  return session;
}
