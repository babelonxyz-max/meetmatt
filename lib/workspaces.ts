import { prisma } from "@/lib/prisma";

type WorkspaceClient = Pick<
  typeof prisma,
  "user" | "workspace" | "workspaceMembership"
>;

export type WorkspaceAccess = {
  workspaceId: string;
  workspaceRole: "owner" | "admin" | "member";
  workspace: {
    id: string;
    slug: string;
    name: string;
    kind: "personal" | "company";
  };
};

type WorkspaceRole = WorkspaceAccess["workspaceRole"];

function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildPersonalWorkspaceSlug(userId: string): string {
  return `personal-${slugifySegment(userId)}`;
}

function buildPersonalWorkspaceName(user: {
  name: string | null;
  email: string | null;
} | null): string {
  const displayName =
    user?.name?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    "Personal";
  return `${displayName} Workspace`;
}

export async function ensurePersonalWorkspaceForUser(
  userId: string,
  db: WorkspaceClient = prisma,
): Promise<WorkspaceAccess> {
  const existingDefaultMembership = await db.workspaceMembership.findFirst({
    where: {
      userId,
      isDefault: true,
    },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        select: {
          id: true,
          slug: true,
          name: true,
          kind: true,
        },
      },
    },
  });

  if (existingDefaultMembership) {
    return {
      workspaceId: existingDefaultMembership.workspaceId,
      workspaceRole: existingDefaultMembership.role,
      workspace: existingDefaultMembership.workspace,
    };
  }

  const existingMembership = await db.workspaceMembership.findFirst({
    where: {
      userId,
      workspace: {
        kind: "personal",
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        select: {
          id: true,
          slug: true,
          name: true,
          kind: true,
        },
      },
    },
  });

  if (existingMembership) {
    await db.workspaceMembership.update({
      where: { id: existingMembership.id },
      data: {
        role: "owner",
        isDefault: true,
      },
    });

    return {
      workspaceId: existingMembership.workspaceId,
      workspaceRole: "owner",
      workspace: existingMembership.workspace,
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
    },
  });

  const workspace = await db.workspace.create({
    data: {
      slug: buildPersonalWorkspaceSlug(userId),
      name: buildPersonalWorkspaceName(user),
      kind: "personal",
      ownerUserId: userId,
      metadata: {
        source: "ensurePersonalWorkspaceForUser",
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
    },
  });

  await db.workspaceMembership.create({
    data: {
      workspaceId: workspace.id,
      userId,
      role: "owner",
      isDefault: true,
    },
  });

  return {
    workspaceId: workspace.id,
    workspaceRole: "owner",
    workspace,
  };
}

export async function resolveWorkspaceAccessForUser(params: {
  userId: string;
  requestedWorkspaceId?: string | null;
  db?: WorkspaceClient;
}): Promise<WorkspaceAccess> {
  const db = params.db ?? prisma;
  const requestedWorkspaceId = params.requestedWorkspaceId?.trim() || null;

  if (!requestedWorkspaceId) {
    return ensurePersonalWorkspaceForUser(params.userId, db);
  }

  const membership = await db.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: requestedWorkspaceId,
        userId: params.userId,
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          slug: true,
          name: true,
          kind: true,
        },
      },
    },
  });

  if (!membership) {
    throw { status: 403, message: "Workspace access denied" };
  }

  return {
    workspaceId: membership.workspaceId,
    workspaceRole: membership.role,
    workspace: membership.workspace,
  };
}

function buildWorkspaceSlug(name: string): string {
  const slug = slugifySegment(name);
  return slug.length > 0 ? slug : `workspace-${Date.now().toString(36)}`;
}

export async function upsertWorkspaceMembership(params: {
  workspaceId: string;
  userId: string;
  role?: WorkspaceRole;
  isDefault?: boolean;
  db?: WorkspaceClient;
}) {
  const db = params.db ?? prisma;
  const role = params.role ?? "member";
  const isDefault = params.isDefault ?? false;

  if (isDefault) {
    await db.workspaceMembership.updateMany({
      where: { userId: params.userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return db.workspaceMembership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: params.workspaceId,
        userId: params.userId,
      },
    },
    update: {
      role,
      isDefault,
    },
    create: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      role,
      isDefault,
    },
  });
}

export async function createWorkspace(params: {
  name: string;
  slug?: string | null;
  kind?: "personal" | "company";
  ownerUserId?: string | null;
  memberUserIds?: string[];
}): Promise<WorkspaceAccess> {
  const name = params.name.trim();
  if (!name) {
    throw { status: 400, message: "Workspace name is required" };
  }

  const slug = params.slug?.trim()
    ? slugifySegment(params.slug)
    : buildWorkspaceSlug(name);

  if (!slug) {
    throw { status: 400, message: "Workspace slug is required" };
  }

  const workspace = await prisma.workspace.create({
    data: {
      slug,
      name,
      kind: params.kind ?? "company",
      ownerUserId: params.ownerUserId ?? null,
      metadata: {
        source: "createWorkspace",
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
    },
  });

  if (params.ownerUserId) {
    const ownerHasDefault = await prisma.workspaceMembership.findFirst({
      where: {
        userId: params.ownerUserId,
        isDefault: true,
      },
      select: { id: true },
    });

    await upsertWorkspaceMembership({
      workspaceId: workspace.id,
      userId: params.ownerUserId,
      role: "owner",
      isDefault: !ownerHasDefault,
    });
  }

  for (const memberUserId of params.memberUserIds ?? []) {
    if (!memberUserId || memberUserId === params.ownerUserId) {
      continue;
    }
    await upsertWorkspaceMembership({
      workspaceId: workspace.id,
      userId: memberUserId,
      role: "member",
    });
  }

  return {
    workspaceId: workspace.id,
    workspaceRole: "owner",
    workspace,
  };
}
