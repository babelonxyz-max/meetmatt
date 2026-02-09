import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/control/users/[id]/note - Add admin note
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { content, adminId } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content required" },
        { status: 400 }
      );
    }

    const note = await prisma.adminNote.create({
      data: {
        userId: id,
        content,
        createdBy: adminId || "admin",
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error("[Control] Add note error:", error);
    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    );
  }
}
