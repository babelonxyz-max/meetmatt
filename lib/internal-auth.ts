import { NextRequest } from "next/server";
import { safeCompare } from "@/lib/crypto-utils";

type InternalAuthMode = "admin" | "internal";

function readBearerToken(req: NextRequest): string {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

function getInternalSecret(): string {
  return (
    process.env.TELETHON_INTERNAL_SECRET?.trim() ||
    process.env.INTERNAL_WEBHOOK_SECRET?.trim() ||
    ""
  );
}

export function isAdminRequest(req: NextRequest): boolean {
  const secret = process.env.ADMIN_AUTH_TOKEN?.trim();
  if (!secret) {
    return false;
  }
  return safeCompare(readBearerToken(req), secret);
}

export function isInternalRequest(req: NextRequest): boolean {
  const secret = getInternalSecret();
  if (!secret) {
    return false;
  }

  const headerSecret =
    req.headers.get("x-telethon-secret") ||
    req.headers.get("x-internal-secret") ||
    readBearerToken(req);

  return safeCompare(headerSecret ?? "", secret);
}

export function requireAdminOrInternal(req: NextRequest): InternalAuthMode {
  if (isInternalRequest(req)) {
    return "internal";
  }
  if (isAdminRequest(req)) {
    return "admin";
  }

  throw { status: 401, message: "Unauthorized" };
}
