import { Webhook } from "standardwebhooks";

const DEFAULT_LIVE_BASE_URL = "https://live.dodopayments.com";
const DEFAULT_TEST_BASE_URL = "https://test.dodopayments.com";

type JsonRecord = Record<string, unknown>;

export type DodoCheckoutResponse = {
  checkout_id: string;
  checkout_url: string;
  expires_at?: string | null;
  [key: string]: unknown;
};

export function getDodoPaymentsBaseUrl(): string {
  const configured = process.env.DODO_PAYMENTS_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const mode = process.env.DODO_PAYMENTS_MODE?.trim().toLowerCase();
  return mode === "test" || mode === "test_mode"
    ? DEFAULT_TEST_BASE_URL
    : DEFAULT_LIVE_BASE_URL;
}

export async function createDodoCheckoutSession(params: {
  apiKey: string;
  productId: string;
  quantity?: number;
  returnUrl?: string | null;
  metadata?: Record<string, string>;
  baseUrl?: string;
  allowedPaymentMethodTypes?: string[];
}): Promise<DodoCheckoutResponse> {
  const response = await fetch(
    `${params.baseUrl ?? getDodoPaymentsBaseUrl()}/checkouts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        product_cart: [
          {
            product_id: params.productId,
            quantity: params.quantity ?? 1,
          },
        ],
        allowed_payment_method_types:
          params.allowedPaymentMethodTypes ?? ["card"],
        metadata: params.metadata,
        return_url: params.returnUrl ?? undefined,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Dodo checkout creation failed");
  }

  return (await response.json()) as DodoCheckoutResponse;
}

export function verifyDodoWebhook(
  payload: string,
  headers: Headers,
  secret: string,
): JsonRecord {
  const verifier = new Webhook(secret);
  return verifier.verify(payload, {
    "webhook-id": headers.get("webhook-id") || "",
    "webhook-timestamp": headers.get("webhook-timestamp") || "",
    "webhook-signature": headers.get("webhook-signature") || "",
  }) as JsonRecord;
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }
  return value as JsonRecord;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function findNestedString(
  source: unknown,
  keys: string[],
  seen = new Set<unknown>(),
): string | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  if (seen.has(source)) {
    return null;
  }
  seen.add(source);

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findNestedString(item, keys, seen);
      if (found) {
        return found;
      }
    }
    return null;
  }

  const record = asRecord(source);
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const found = readString(record[key]);
    if (found) {
      return found;
    }
  }

  for (const value of Object.values(record)) {
    const found = findNestedString(value, keys, seen);
    if (found) {
      return found;
    }
  }

  return null;
}

export function readJsonString(
  value: unknown,
  keys: string[],
): string | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const found = readString(record[key]);
    if (found) {
      return found;
    }
  }

  return null;
}

export function inferPaymentStatusFromDodoEvent(event: unknown): string | null {
  const record = asRecord(event);
  const normalized =
    readString(record?.type)?.toLowerCase() ||
    readString(record?.event_type)?.toLowerCase() ||
    findNestedString(event, ["payment_status", "status"])?.toLowerCase() ||
    null;

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("success") ||
    normalized.includes("succeeded") ||
    normalized.includes("completed") ||
    normalized.includes("paid") ||
    normalized.includes("captured")
  ) {
    return "confirmed";
  }

  if (normalized.includes("partially_paid") || normalized.includes("partial")) {
    return "partial";
  }

  if (
    normalized.includes("fail") ||
    normalized.includes("expired") ||
    normalized.includes("cancelled") ||
    normalized.includes("canceled")
  ) {
    return "failed";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("processing") ||
    normalized.includes("created")
  ) {
    return "pending";
  }

  return null;
}

export function extractDodoPaymentReferences(event: unknown): {
  eventType: string | null;
  paymentSessionId: string | null;
  externalPaymentId: string | null;
} {
  const record = asRecord(event);
  return {
    eventType:
      readString(record?.type) ||
      readString(record?.event_type) ||
      readString(record?.event) ||
      null,
    paymentSessionId: findNestedString(event, [
      "sessionId",
      "session_id",
      "orderId",
      "order_id",
      "paymentSessionId",
      "payment_session_id",
    ]),
    externalPaymentId: findNestedString(event, [
      "checkout_id",
      "checkoutId",
      "payment_id",
      "paymentId",
      "id",
    ]),
  };
}
