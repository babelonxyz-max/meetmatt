// NOWPayments API Integration
// Documentation: https://documenter.getpostman.com/view/7907941/2s93JusNJt

const API_BASE_URL = "https://api.nowpayments.io/v1";
const API_KEY = process.env.NOWPAYMENTS_API_KEY || "";

interface CreatePaymentRequest {
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  order_id: string;
  order_description: string;
  ipn_callback_url?: string;
  success_url?: string;
  cancel_url?: string;
}

interface PaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  valid_until: string;
}

interface MinAmountResponse {
  min_amount: number;
}

// Get available currencies
export async function getAvailableCurrencies(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/currencies`, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch currencies: ${response.statusText}`);
    }

    const data = await response.json();
    return data.currencies || [];
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return [];
  }
}

// Get minimum payment amount for a currency
export async function getMinimumAmount(currency: string): Promise<number> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/min-amount?currency_from=${currency}&currency_to=usd`,
      {
        headers: {
          "x-api-key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch min amount: ${response.statusText}`);
    }

    const data: MinAmountResponse = await response.json();
    return data.min_amount;
  } catch (error) {
    console.error("Error fetching minimum amount:", error);
    return 0;
  }
}

// Create a new payment
export async function createPayment(
  request: CreatePaymentRequest
): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Payment creation failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
}

// Get payment status
export async function getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/payment/${paymentId}`, {
      headers: {
        "x-api-key": API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payment status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching payment status:", error);
    throw error;
  }
}

// Verify IPN signature (for webhooks)
import { createHmac } from "crypto";

export function verifyIPNSignature(
  payload: Record<string, unknown>,
  signature: string,
  secretKey: string
): boolean {
  if (!signature || !secretKey) return false;
  const sortedKeys = Object.keys(payload).sort();
  const sortedPayload: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedPayload[key] = payload[key];
  }
  const hmac = createHmac("sha512", secretKey);
  hmac.update(JSON.stringify(sortedPayload));
  const expectedSignature = hmac.digest("hex");
  return expectedSignature === signature;
}

// Supported cryptocurrencies with their details
export const SUPPORTED_CRYPTO = [
  { code: "btc", name: "Bitcoin", icon: "₿", network: "Bitcoin" },
  { code: "eth", name: "Ethereum", icon: "Ξ", network: "ERC20" },
  { code: "usdt", name: "Tether (ERC20)", icon: "₮", network: "ERC20" },
  { code: "usdc", name: "USD Coin", icon: "$", network: "ERC20" },
  { code: "bnb", name: "BNB", icon: "B", network: "BEP2" },
  { code: "busd", name: "BUSD", icon: "$", network: "BEP20" },
  { code: "sol", name: "Solana", icon: "◎", network: "Solana" },
  { code: "matic", name: "Polygon", icon: "M", network: "Polygon" },
  { code: "trx", name: "TRON", icon: "T", network: "TRC20" },
];

