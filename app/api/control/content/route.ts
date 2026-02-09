import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/control/content - Get all website content
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");

    const where = section ? { section } : {};

    const contents = await prisma.websiteContent.findMany({
      where,
      orderBy: [
        { section: "asc" },
        { key: "asc" },
      ],
    });

    // Group by section for easier consumption
    const grouped = contents.reduce((acc, item) => {
      if (!acc[item.section]) {
        acc[item.section] = {};
      }
      acc[item.section][item.key] = {
        value: item.value,
        type: item.type,
        updatedAt: item.updatedAt,
      };
      return acc;
    }, {} as Record<string, Record<string, any>>);

    return NextResponse.json({ 
      contents,
      grouped,
    });
  } catch (error: any) {
    console.error("[Control] Get content error:", error);
    return NextResponse.json(
      { error: "Failed to get content" },
      { status: 500 }
    );
  }
}

// POST /api/control/content - Update or create content
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { section, key, value, type = "text", adminId } = body;

    if (!section || !key || value === undefined) {
      return NextResponse.json(
        { error: "Section, key, and value required" },
        { status: 400 }
      );
    }

    const content = await prisma.websiteContent.upsert({
      where: {
        section_key: {
          section,
          key,
        },
      },
      update: {
        value,
        type,
        updatedBy: adminId || "admin",
      },
      create: {
        section,
        key,
        value,
        type,
        updatedBy: adminId || "admin",
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "content_updated",
        entityType: "content",
        entityId: `${section}.${key}`,
        metadata: JSON.stringify({ section, key, type }),
      },
    });

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("[Control] Update content error:", error);
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 }
    );
  }
}

// DELETE /api/control/content - Delete content
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");
    const key = searchParams.get("key");

    if (!section || !key) {
      return NextResponse.json(
        { error: "Section and key required" },
        { status: 400 }
      );
    }

    await prisma.websiteContent.delete({
      where: {
        section_key: {
          section,
          key,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Control] Delete content error:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
}
