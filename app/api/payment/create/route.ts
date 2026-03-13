import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ensurePrimaryTelegramIdentityForAgent } from "@/lib/agent-telegram";
import { TRANSPORT_PROVIDER } from "@/lib/agent-blueprint";
import { createConfirmedAdminPaymentForAgent } from "@/lib/admin-payment";
import { getErrorMessage, getStatusError } from "@/lib/http-error";
import { syncCapabilityCommerceCatalog } from "@/lib/capability-commerce/registry";
import {
  createDodoCheckoutSession,
  readJsonString,
} from "@/lib/dodo-payments";
import {
  createWorkspaceDodoCheckoutSession,
  isSeshAdminConfigured,
} from "@/lib/sesh";
import {
  DEFAULT_DAY_PASS_PRICE_USD,
  DEFAULT_MONTHLY_LAUNCH_PRICE_USD,
  getLaunchPriceForPurchaseType,
  isCardCheckoutEnabledForPurchaseType,
  resolveUserLaunchPricing,
} from "@/lib/user-launch-pricing";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";
const DODO_DISPLAY_CURRENCY = "USD";

const ALLOWED_CURRENCIES = [
  "usdt", "usdterc20", "usdtbsc", "usdtsol",
  "usdc", "usdccsol", "usdcarb",
];

type PaymentProvider = "nowpayments" | "dodo" | "admin";
type PaymentMethodType = "crypto" | "card";
type PurchaseType = "subscription" | "day_pass" | "addon" | "topup";

function readUsdPrice(
  value: Prisma.JsonValue | null,
): number | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  const maybeUsd = (value as { usd?: unknown }).usd;
  if (typeof maybeUsd === "number" && Number.isFinite(maybeUsd) && maybeUsd > 0) {
    return maybeUsd;
  }

  return null;
}

function resolveProvider(
  body: Record<string, unknown>,
): { provider: PaymentProvider; methodType: PaymentMethodType } {
  const providerValue =
    typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "";
  const methodValue =
    typeof body.paymentMethod === "string" ? body.paymentMethod.trim().toLowerCase() : "";

  if (providerValue === "dodo" || methodValue === "card") {
    return { provider: "dodo", methodType: "card" };
  }

  return { provider: "nowpayments", methodType: "crypto" };
}

export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireAuth(req);
    const body = await req.json() as Record<string, unknown>;
    const { provider, methodType } = resolveProvider(body);
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
    const currency =
      typeof body.currency === "string" && body.currency.trim().length > 0
        ? body.currency.trim().toLowerCase()
        : "usdt";
    const purchaseType: PurchaseType =
      body.purchaseType === "addon"
        ? "addon"
        : body.purchaseType === "topup"
          ? "topup"
          : body.purchaseType === "day_pass"
            ? "day_pass"
          : "subscription";

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId required" },
        { status: 400 },
      );
    }

    if (provider === "nowpayments" && !ALLOWED_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: "Unsupported currency" },
        { status: 400 },
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (
      !agent ||
      (
        agent.workspaceId !== workspaceId &&
        !(agent.workspaceId === null && agent.userId === userId)
      )
    ) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (purchaseType === "subscription" || purchaseType === "day_pass") {
      const telegramLaunch = await ensurePrimaryTelegramIdentityForAgent(agent.id);
      if (
        !telegramLaunch?.botAssigned ||
        (
          (telegramLaunch.transportProvider === TRANSPORT_PROVIDER.telegramBotApi ||
            agent.transportProvider === TRANSPORT_PROVIDER.telegramBotApi) &&
          !telegramLaunch.botToken
        )
      ) {
        return NextResponse.json(
          { error: "Assign a Telegram bot before checkout" },
          { status: 400 },
        );
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        monthlyLaunchFeeUsd: true,
        dayPassLaunchFeeUsd: true,
        monthlyLaunchFeeWaived: true,
        dayPassLaunchFeeWaived: true,
        billingNotes: true,
      },
    });
    const launchPricing = resolveUserLaunchPricing(user);

    let orderId =
      purchaseType === "day_pass"
        ? `daypass_${agentId}_${Date.now()}`
        : `matt_${agentId}_${Date.now()}`;
    let priceAmount =
      purchaseType === "day_pass"
        ? DEFAULT_DAY_PASS_PRICE_USD
        : DEFAULT_MONTHLY_LAUNCH_PRICE_USD;
    let orderDescription =
      purchaseType === "day_pass"
        ? `24-hour pass for AI agent: ${agent.name}`
        : `Deploy AI agent: ${agent.name}`;
    let paymentPurpose =
      purchaseType === "day_pass" ? "agent_day_pass" : "agent_subscription";
    let targetType: string | null = "agent";
    let targetId: string | null = agent.id;
    let lineItems: Prisma.InputJsonValue | undefined = {
      agentId: agent.id,
      agentName: agent.name,
      billingPlan: purchaseType === "day_pass" ? "day_pass" : "monthly",
    } satisfies Prisma.InputJsonObject;
    let dodoProductId =
      (
        purchaseType === "day_pass"
          ? process.env.DODO_PAYMENTS_DAY_PASS_PRODUCT_ID
          : process.env.DODO_PAYMENTS_MATT_PRODUCT_ID
      )?.trim() || null;

    if (purchaseType === "subscription" || purchaseType === "day_pass") {
      priceAmount = getLaunchPriceForPurchaseType(
        launchPricing,
        purchaseType === "day_pass" ? "day_pass" : "subscription",
      );
      lineItems = {
        ...(lineItems as Prisma.InputJsonObject),
        billingPriceUsd: priceAmount,
        pricingSource:
          purchaseType === "day_pass"
            ? launchPricing.dayPassSource
            : launchPricing.monthlySource,
      } satisfies Prisma.InputJsonObject;

      if (priceAmount === 0) {
        const payment = await createConfirmedAdminPaymentForAgent({
          agentId: agent.id,
          userId,
          workspaceId,
          plan: purchaseType === "day_pass" ? "day_pass" : "monthly",
          amountUsd: 0,
          requestUrl: req.url,
          source: "user-pricing-waiver",
          notes: user?.billingNotes ?? null,
        });

        return NextResponse.json({
          success: true,
          payment: {
            id: payment.id,
            provider: payment.provider,
            paymentMethodType: payment.paymentMethodType,
            checkoutUrl: payment.checkoutUrl,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            confirmedAt: payment.confirmedAt,
            expiresAt: payment.expiresAt,
          },
        });
      }
    }

    if (purchaseType === "addon" || purchaseType === "topup") {
      await syncCapabilityCommerceCatalog();
    }

    if (purchaseType === "addon") {
      const catalogItemSlug =
        typeof body.catalogItemSlug === "string" ? body.catalogItemSlug.trim() : "";
      if (!catalogItemSlug) {
        return NextResponse.json(
          { error: "catalogItemSlug required for add-on purchases" },
          { status: 400 },
        );
      }

      const catalogItem = await prisma.catalogItem.findUnique({
        where: { slug: catalogItemSlug },
      });
      if (!catalogItem) {
        return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });
      }

      const addonPrice = readUsdPrice(catalogItem.pricingMeta);
      if (!addonPrice) {
        return NextResponse.json(
          { error: "Catalog item is not purchasable" },
          { status: 400 },
        );
      }

      paymentPurpose = "addon";
      targetType = "catalog_item";
      targetId = catalogItem.id;
      priceAmount = addonPrice;
      orderId = `addon_${agent.id}_${catalogItem.slug}_${Date.now()}`;
      orderDescription = `Add-on for ${agent.name}: ${catalogItem.name}`;
      lineItems = {
        agentId: agent.id,
        agentName: agent.name,
        catalogItemSlug: catalogItem.slug,
        catalogItemId: catalogItem.id,
      } satisfies Prisma.InputJsonObject;
      dodoProductId = readJsonString(catalogItem.pricingMeta, [
        "dodoProductId",
        "dodo_product_id",
      ]);
    }

    if (purchaseType === "topup") {
      const packSlug =
        typeof body.packSlug === "string" ? body.packSlug.trim() : "";
      if (!packSlug) {
        return NextResponse.json(
          { error: "packSlug required for top-up purchases" },
          { status: 400 },
        );
      }

      const entitlementPack = await prisma.entitlementPack.findUnique({
        where: { slug: packSlug },
      });
      if (!entitlementPack) {
        return NextResponse.json({ error: "Entitlement pack not found" }, { status: 404 });
      }

      const topupPrice = readUsdPrice(entitlementPack.pricingSpec);
      if (!topupPrice) {
        return NextResponse.json(
          { error: "Entitlement pack is not purchasable" },
          { status: 400 },
        );
      }

      paymentPurpose = "topup";
      targetType = "entitlement_pack";
      targetId = entitlementPack.id;
      priceAmount = topupPrice;
      orderId = `topup_${agent.id}_${entitlementPack.slug}_${Date.now()}`;
      orderDescription = `Top-up for ${agent.name}: ${entitlementPack.name}`;
      lineItems = {
        agentId: agent.id,
        agentName: agent.name,
        packSlug: entitlementPack.slug,
        packId: entitlementPack.id,
      } satisfies Prisma.InputJsonObject;
      dodoProductId = readJsonString(entitlementPack.pricingSpec, [
        "dodoProductId",
        "dodo_product_id",
      ]);
    }

    const configuredBaseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!configuredBaseUrl) {
      console.error("[Payment/Create] APP_URL/NEXT_PUBLIC_APP_URL not configured");
      return NextResponse.json({ error: "Application URL not configured" }, { status: 503 });
    }

    let callbackBaseUrl: string;
    try {
      callbackBaseUrl = new URL(configuredBaseUrl).origin;
    } catch {
      console.error("[Payment/Create] Invalid APP_URL/NEXT_PUBLIC_APP_URL:", configuredBaseUrl);
      return NextResponse.json({ error: "Application URL invalid" }, { status: 503 });
    }

    if (provider === "dodo") {
      if (
        (purchaseType === "subscription" || purchaseType === "day_pass") &&
        !isCardCheckoutEnabledForPurchaseType(
          launchPricing,
          purchaseType === "day_pass" ? "day_pass" : "subscription",
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Card checkout is not available for this user's custom launch pricing yet. Use crypto or waive the fee in ops.",
          },
          { status: 400 },
        );
      }

      if (!dodoProductId) {
        console.error("[Payment/Create] Dodo product mapping missing", {
          purchaseType,
          agentId,
          targetId,
        });
        return NextResponse.json(
          { error: "Card checkout is not configured for this item yet" },
          { status: 503 },
        );
      }

      const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
      if (!isSeshAdminConfigured() && !apiKey) {
        console.error("[Payment/Create] DODO_PAYMENTS_API_KEY not configured");
        return NextResponse.json({ error: "Card payments not configured" }, { status: 503 });
      }

      const returnUrl =
        `${callbackBaseUrl}/dashboard?paymentSessionId=${encodeURIComponent(orderId)}`;
      const checkout = isSeshAdminConfigured()
        ? await createWorkspaceDodoCheckoutSession({
            workspaceId,
            productCart: [
              {
                product_id: dodoProductId,
                quantity: 1,
              },
            ],
            customer: {
              email: user?.email ?? null,
              name: user?.name ?? agent.name,
            },
            returnUrl,
            options: {
              allowed_payment_method_types: ["card"],
              metadata: {
                sessionId: orderId,
                agentId: agent.id,
                userId,
                workspaceId,
                purchaseType,
              },
            },
          })
        : await createDodoCheckoutSession({
            apiKey: apiKey || "",
            productId: dodoProductId,
            metadata: {
              sessionId: orderId,
              agentId: agent.id,
              userId,
              workspaceId,
              purchaseType,
            },
            returnUrl,
          });

      const checkoutSession =
        "session" in checkout &&
        checkout.session &&
        typeof checkout.session === "object" &&
        !Array.isArray(checkout.session)
          ? checkout.session as Record<string, unknown>
          : null;
      const directCheckoutUrl =
        "checkout_url" in checkout && typeof checkout.checkout_url === "string"
          ? checkout.checkout_url
          : null;
      const seshCheckoutUrl =
        "checkoutUrl" in checkout && typeof checkout.checkoutUrl === "string"
          ? checkout.checkoutUrl
          : null;
      const checkoutUrl =
        seshCheckoutUrl ||
        directCheckoutUrl ||
        (typeof checkoutSession?.checkout_url === "string"
          ? checkoutSession.checkout_url
          : null);

      if (!checkoutUrl) {
        console.error("[Payment/Create] Dodo checkout response missing checkoutUrl", {
          purchaseType,
          orderId,
          workspaceId,
        });
        return NextResponse.json(
          { error: "Card checkout did not return a checkout URL" },
          { status: 502 },
        );
      }

      const externalPaymentId =
        ("sessionId" in checkout && typeof checkout.sessionId === "string"
          ? checkout.sessionId
          : null) ||
        ("checkout_id" in checkout && typeof checkout.checkout_id === "string"
          ? checkout.checkout_id
          : null) ||
        (typeof checkoutSession?.session_id === "string"
          ? checkoutSession.session_id
          : null);
      const expiresAt =
        typeof checkoutSession?.expires_at === "string"
          ? checkoutSession.expires_at
          : "expires_at" in checkout && typeof checkout.expires_at === "string"
            ? checkout.expires_at
          : null;

      const payment = await prisma.payment.create({
        data: {
          sessionId: orderId,
          provider: "dodo",
          paymentMethodType: methodType,
          externalPaymentId,
          tier: "matt",
          currency: DODO_DISPLAY_CURRENCY,
          amount: priceAmount,
          address: null,
          checkoutUrl,
          status: "pending",
          paymentPurpose,
          targetType,
          targetId,
          lineItems,
          providerMetadata: checkout as Prisma.InputJsonValue,
          userId,
          workspaceId,
          expiresAt: expiresAt
            ? new Date(expiresAt)
            : new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          provider: payment.provider,
          paymentMethodType: payment.paymentMethodType,
          checkoutUrl: payment.checkoutUrl,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          expiresAt: payment.expiresAt,
        },
      });
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      console.error("[Payment/Create] NOWPAYMENTS_API_KEY not configured");
      return NextResponse.json({ error: "Payment service not configured" }, { status: 503 });
    }

    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        price_amount: priceAmount,
        price_currency: "usd",
        pay_currency: currency,
        order_id: orderId,
        order_description: orderDescription,
        ipn_callback_url: `${callbackBaseUrl}/api/webhooks/payment`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Payment creation failed");
    }

    const data = await response.json();

    const payment = await prisma.payment.create({
      data: {
        sessionId: orderId,
        provider: "nowpayments",
        paymentMethodType: methodType,
        externalPaymentId:
          typeof data.payment_id === "string" ? data.payment_id : null,
        tier: "matt",
        currency: currency.toUpperCase(),
        amount: data.pay_amount,
        address: data.pay_address,
        checkoutUrl: null,
        status: "pending",
        paymentPurpose,
        targetType,
        targetId,
        lineItems,
        providerMetadata: data as Prisma.InputJsonValue,
        userId,
        workspaceId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        provider: payment.provider,
        paymentMethodType: payment.paymentMethodType,
        address: payment.address,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        expiresAt: payment.expiresAt,
      },
    });
  } catch (error: unknown) {
    const statusError = getStatusError(error);
    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: statusError.status });
    }
    console.error("[Payment/Create] Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
