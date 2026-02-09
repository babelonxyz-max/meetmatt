import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { defaultWebsiteContent } from "@/lib/cms-content";

// POST /api/control/content/seed - Seed default website content
export async function POST(req: NextRequest) {
  try {
    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const item of defaultWebsiteContent) {
      try {
        await prisma.websiteContent.upsert({
          where: {
            section_key: {
              section: item.section,
              key: item.key,
            },
          },
          update: {
            value: item.value,
            type: item.type,
          },
          create: {
            section: item.section,
            key: item.key,
            value: item.value,
            type: item.type,
          },
        });
        results.created++;
      } catch (error: any) {
        results.errors.push(`${item.section}.${item.key}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.created} content items`,
      results,
    });
  } catch (error: any) {
    console.error("[Content Seed] Error:", error);
    return NextResponse.json(
      { error: "Failed to seed content" },
      { status: 500 }
    );
  }
}

// GET /api/control/content/seed - Get seed count info
export async function GET(req: NextRequest) {
  try {
    const existingCount = await prisma.websiteContent.count();
    const totalSeedItems = defaultWebsiteContent.length;

    return NextResponse.json({
      existingContentCount: existingCount,
      totalSeedItems,
      canSeed: existingCount < totalSeedItems,
      sections: [...new Set(defaultWebsiteContent.map((item) => item.section))],
    });
  } catch (error: any) {
    console.error("[Content Seed] Error:", error);
    return NextResponse.json(
      { error: "Failed to get seed info" },
      { status: 500 }
    );
  }
}
