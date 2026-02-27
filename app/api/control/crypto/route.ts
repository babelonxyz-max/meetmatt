import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Default crypto options
const DEFAULT_CRYPTO_OPTIONS = [
  { code: "usdh", name: "USDH", icon: "🏦", network: "HyperEVM", discount: "-10%", enabled: true },
  { code: "usdt", name: "USDT", icon: "💵", network: "TRC20", enabled: true },
  { code: "usdterc20", name: "USDT", icon: "💵", network: "ERC20", enabled: true },
  { code: "usdtbsc", name: "USDT", icon: "💵", network: "BSC", enabled: false },
  { code: "usdtsol", name: "USDT", icon: "💵", network: "Solana", enabled: true },
  { code: "usdc", name: "USDC", icon: "💰", network: "Base", enabled: true },
  { code: "usdccsol", name: "USDC", icon: "💰", network: "Solana", enabled: true },
  { code: "usdcarb", name: "USDC", icon: "💰", network: "Arbitrum", enabled: false },
];

const CRYPTO_SETTINGS_KEY = "crypto_payment_options";
const ADMIN_TOKEN = process.env.ADMIN_AUTH_TOKEN || "dev-token";

// Simple auth check
async function checkAuth(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  return null;
}

// GET /api/control/crypto - Get crypto payment options
export async function GET(req: NextRequest) {
  try {
    // Public endpoint - no auth required for reading
    const setting = await prisma.systemSetting.findUnique({
      where: { key: CRYPTO_SETTINGS_KEY },
    });

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        return NextResponse.json({ options: parsed });
      } catch {
        return NextResponse.json({ options: DEFAULT_CRYPTO_OPTIONS });
      }
    }

    // Return defaults if not set
    return NextResponse.json({ options: DEFAULT_CRYPTO_OPTIONS });
  } catch (error) {
    console.error("[Control/Crypto] Error:", error);
    return NextResponse.json({ options: DEFAULT_CRYPTO_OPTIONS });
  }
}

// POST /api/control/crypto - Update crypto payment options (admin only)
export async function POST(req: NextRequest) {
  try {
    // Check auth
    const authError = await checkAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const { options } = body;

    if (!Array.isArray(options)) {
      return NextResponse.json(
        { error: "Options must be an array" },
        { status: 400 }
      );
    }

    // Validate each option
    for (const opt of options) {
      if (!opt.code || !opt.name) {
        return NextResponse.json(
          { error: "Each option must have code and name" },
          { status: 400 }
        );
      }
    }

    // Update or create setting
    await prisma.systemSetting.upsert({
      where: { key: CRYPTO_SETTINGS_KEY },
      update: { value: JSON.stringify(options) },
      create: {
        key: CRYPTO_SETTINGS_KEY,
        value: JSON.stringify(options),
        description: "Available cryptocurrency payment options",
      },
    });

    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    console.error("[Control/Crypto] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update crypto options" },
      { status: 500 }
    );
  }
}

// PUT /api/control/crypto - Reset to defaults (admin only)
export async function PUT(req: NextRequest) {
  try {
    // Check auth
    const authError = await checkAuth(req);
    if (authError) return authError;

    await prisma.systemSetting.upsert({
      where: { key: CRYPTO_SETTINGS_KEY },
      update: { value: JSON.stringify(DEFAULT_CRYPTO_OPTIONS) },
      create: {
        key: CRYPTO_SETTINGS_KEY,
        value: JSON.stringify(DEFAULT_CRYPTO_OPTIONS),
        description: "Available cryptocurrency payment options",
      },
    });

    return NextResponse.json({ success: true, options: DEFAULT_CRYPTO_OPTIONS });
  } catch (error: any) {
    console.error("[Control/Crypto] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset crypto options" },
      { status: 500 }
    );
  }
}
