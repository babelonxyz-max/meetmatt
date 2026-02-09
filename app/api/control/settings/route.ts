import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Default settings
const DEFAULT_SETTINGS = {
  // Pricing
  "pricing.monthly": "150",
  "pricing.annual": "1000",
  "pricing.annual_discount_percent": "44",
  
  // Features
  "features.signup_enabled": "true",
  "features.maintenance_mode": "false",
  "features.waitlist_mode": "false",
  "features.devin_integration": "true",
  
  // Website
  "website.title": "MeetMatt - AI Agents for Everyone",
  "website.description": "Deploy your own AI agent in minutes",
  "website.hero_title": "Your AI Agent, Ready in Minutes",
  "website.hero_subtitle": "Deploy a custom AI agent that works 24/7 for your business",
  "website.cta_primary": "Create Your Agent",
  "website.cta_secondary": "View Pricing",
};

// GET /api/control/settings - Get all settings
export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });

    // Create a map of current settings
    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    // Merge with defaults
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...settingsMap,
    };

    return NextResponse.json({
      settings,
      settingsMap: mergedSettings,
      defaults: DEFAULT_SETTINGS,
    });
  } catch (error: any) {
    console.error("[Control] Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    );
  }
}

// POST /api/control/settings - Update or create setting
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value, description, adminId } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value required" },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: String(value),
        description,
        updatedBy: adminId || "admin",
      },
      create: {
        key,
        value: String(value),
        description,
        updatedBy: adminId || "admin",
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "setting_updated",
        entityType: "setting",
        entityId: key,
        metadata: JSON.stringify({ value }),
      },
    });

    return NextResponse.json({ setting });
  } catch (error: any) {
    console.error("[Control] Update setting error:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}

// DELETE /api/control/settings - Delete setting
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Key required" },
        { status: 400 }
      );
    }

    await prisma.systemSetting.delete({
      where: { key },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Control] Delete setting error:", error);
    return NextResponse.json(
      { error: "Failed to delete setting" },
      { status: 500 }
    );
  }
}
