import { NextRequest } from "next/server";
import { privyClient } from "@/lib/privy";
import { prisma } from "@/lib/prisma";
import { ensureMattRelationshipPack } from "@/lib/matt-relationships";
import { ensurePersonalWorkspaceForUser, resolveWorkspaceAccessForUser } from "@/lib/workspaces";

interface AuthResult {
  userId: string;
  privyId: string;
  workspaceId: string;
  workspaceRole: "owner" | "admin" | "member";
}

/**
 * Require authentication for an API route.
 * Extracts Bearer token, verifies via Privy, finds/creates DB user.
 * Throws an object with { status, message } on failure.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Missing or invalid Authorization header" };
  }

  const token = authHeader.slice(7);

  let verifiedClaims;
  try {
    verifiedClaims = await privyClient.verifyAuthToken(token);
  } catch {
    throw { status: 401, message: "Invalid or expired token" };
  }

  const privyId = verifiedClaims.userId;

  // Find or create DB user
  let user = await prisma.user.findUnique({
    where: { privyId },
    select: { id: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        privyId,
        lastLoginAt: new Date(),
      },
      select: { id: true },
    });

    const workspace = await ensurePersonalWorkspaceForUser(user.id);
    await ensureMattRelationshipPack({
      userId: user.id,
      workspaceId: workspace.workspaceId,
    });
  }

  const requestedWorkspaceId =
    request.headers.get("x-workspace-id") ||
    new URL(request.url).searchParams.get("workspaceId");

  const workspaceAccess = await resolveWorkspaceAccessForUser({
    userId: user.id,
    requestedWorkspaceId,
  });

  return {
    userId: user.id,
    privyId,
    workspaceId: workspaceAccess.workspaceId,
    workspaceRole: workspaceAccess.workspaceRole,
  };
}
