import { prisma } from "./prisma";

// Generate a unique affiliate code
export function generateAffiliateCode(): string {
  return `matt-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// Track referral signup
export async function trackReferralSignup(code: string, referredUserId: string) {
  try {
    // Find referrer by code
    const referrer = await prisma.user.findUnique({
      where: { affiliateCode: code },
    });

    if (!referrer || referrer.id === referredUserId) {
      return null;
    }

    // Check if referral already exists
    const existingReferral = await prisma.referral.findFirst({
      where: {
        OR: [
          { referredId: referredUserId },
          { code, referredId: null },
        ],
      },
    });

    if (existingReferral) {
      // Update with referred user if not already set
      if (!existingReferral.referredId) {
        return await prisma.referral.update({
          where: { id: existingReferral.id },
          data: { referredId: referredUserId },
        });
      }
      return existingReferral;
    }

    // Create new referral
    return await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: referredUserId,
        code,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Error tracking referral:", error);
    return null;
  }
}

// Process referral commission
export async function processReferralCommission(
  paymentId: string,
  referralCode: string
) {
  try {
    const referral = await prisma.referral.findFirst({
      where: { code: referralCode },
      include: { referrer: true },
    });

    if (!referral) return null;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.status !== "completed") return null;

    // Calculate commission (default 20%)
    const commission = (payment.amount * referral.commissionPercent) / 100;

    // Update referral
    const updatedReferral = await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: "active",
        commissionEarned: { increment: commission },
        paymentCount: { increment: 1 },
        totalRevenue: { increment: payment.amount / 100 },
      },
    });

    // Update referrer's affiliate earnings
    await prisma.user.update({
      where: { id: referral.referrerId },
      data: {
        affiliateEarnings: { increment: commission },
      },
    });

    return updatedReferral;
  } catch (error) {
    console.error("Error processing referral commission:", error);
    return null;
  }
}

// Get affiliate stats
export async function getAffiliateStats(userId: string) {
  try {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: {
          select: {
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      totalReferrals: referrals.length,
      activeReferrals: referrals.filter((r) => r.status === "active").length,
      totalCommission: referrals.reduce((sum, r) => sum + r.commissionEarned, 0),
      totalRevenue: referrals.reduce((sum, r) => sum + r.totalRevenue, 0),
      referrals: referrals,
    };

    return stats;
  } catch (error) {
    console.error("Error getting affiliate stats:", error);
    return null;
  }
}

// Create coupon for referral
export async function createReferralCoupon(referrerId: string, discountPercent = 10) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: referrerId },
    });

    if (!user?.affiliateCode) return null;

    const code = `${user.affiliateCode}-${discountPercent}`;

    // Check if coupon already exists
    const existing = await prisma.coupon.findUnique({
      where: { code },
    });

    if (existing) return existing;

    // Create new coupon
    return await prisma.coupon.create({
      data: {
        code,
        type: "percentage",
        value: discountPercent,
        referrerId,
        maxUsesPerUser: 1,
        newCustomersOnly: true,
      },
    });
  } catch (error) {
    console.error("Error creating referral coupon:", error);
    return null;
  }
}
