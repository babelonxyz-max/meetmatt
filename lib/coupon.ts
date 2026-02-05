import { prisma } from "./prisma";

interface ValidateCouponResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    type: "percentage" | "fixed_amount";
    value: number;
  };
  discountAmount: number;
  error?: string;
}

// Validate coupon code
export async function validateCoupon(
  code: string,
  userId: string,
  planId: string,
  amount: number
): Promise<ValidateCouponResult> {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return { valid: false, discountAmount: 0, error: "Invalid coupon code" };
    }

    // Check validity period
    const now = new Date();
    if (now < coupon.validFrom) {
      return { valid: false, discountAmount: 0, error: "Coupon not yet valid" };
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      return { valid: false, discountAmount: 0, error: "Coupon expired" };
    }

    // Check max uses
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, discountAmount: 0, error: "Coupon limit reached" };
    }

    // Check per-user limit
    const userUsage = await prisma.payment.count({
      where: {
        userId,
        referralCode: code,
      },
    });
    if (userUsage >= coupon.maxUsesPerUser) {
      return { valid: false, discountAmount: 0, error: "Coupon already used" };
    }

    // Check if applicable to plan
    if (
      coupon.applicablePlans.length > 0 &&
      !coupon.applicablePlans.includes(planId)
    ) {
      return {
        valid: false,
        discountAmount: 0,
        error: "Coupon not applicable to this plan",
      };
    }

    // Check new customers only
    if (coupon.newCustomersOnly) {
      const existingPayment = await prisma.payment.findFirst({
        where: { userId },
      });
      if (existingPayment) {
        return {
          valid: false,
          discountAmount: 0,
          error: "For new customers only",
        };
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === "percentage") {
      discountAmount = (amount * coupon.value) / 100;
    } else {
      discountAmount = coupon.value;
    }

    // Ensure discount doesn't exceed amount
    discountAmount = Math.min(discountAmount, amount);

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
      discountAmount,
    };
  } catch (error) {
    console.error("Error validating coupon:", error);
    return { valid: false, discountAmount: 0, error: "Error validating coupon" };
  }
}

// Apply coupon to payment
export async function applyCoupon(couponId: string, paymentId: string) {
  try {
    await prisma.$transaction([
      // Increment coupon usage
      prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      }),
      // Link coupon to payment
      prisma.payment.update({
        where: { id: paymentId },
        data: { referralCode: couponId },
      }),
    ]);

    return true;
  } catch (error) {
    console.error("Error applying coupon:", error);
    return false;
  }
}

// Create admin coupon
export async function createAdminCoupon(data: {
  code: string;
  type: "percentage" | "fixed_amount";
  value: number;
  maxUses?: number;
  validUntil?: Date;
  applicablePlans?: string[];
  newCustomersOnly?: boolean;
}) {
  try {
    return await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        maxUses: data.maxUses,
        validUntil: data.validUntil,
        applicablePlans: data.applicablePlans || [],
        newCustomersOnly: data.newCustomersOnly || false,
      },
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return null;
  }
}

// Get coupon by code
export async function getCoupon(code: string) {
  try {
    return await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
  } catch (error) {
    console.error("Error getting coupon:", error);
    return null;
  }
}

// List active coupons
export async function listActiveCoupons() {
  try {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    // Filter active coupons manually
    return coupons.filter((coupon) => {
      const isValidTime = coupon.validFrom <= now && 
        (coupon.validUntil === null || coupon.validUntil > now);
      const hasUsesLeft = coupon.maxUses === null || coupon.usedCount < coupon.maxUses;
      return isValidTime && hasUsesLeft;
    });
  } catch (error) {
    console.error("Error listing coupons:", error);
    return [];
  }
}
