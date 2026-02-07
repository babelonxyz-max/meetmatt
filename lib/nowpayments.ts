// NOWPayments API Integration
// Documentation: https://documenter.getpostman.com/view/7907941/2s93JusNJt

const API_BASE_URL = "https://api.nowpayments.io/v1";
const API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const PUBLIC_KEY = process.env.NEXT_PUBLIC_NOWPAYMENTS_PUBLIC_KEY || "";

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
export function verifyIPNSignature(
  payload: string,
  signature: string,
  secretKey: string
): boolean {
  // In production, implement proper HMAC verification
  // This is a placeholder - NOWPayments uses HMAC-SHA512
  return true;
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

// Mock payment creation for development
export function createMockPayment(
  amount: number,
  currency: string
): PaymentResponse {
  // Generate proper mock address based on currency
  let address: string;
  if (currency.startsWith('usdt') || currency.startsWith('usdc') || currency.includes('erc20')) {
    // Ethereum address (42 chars: 0x + 40 hex)
    address = '0x' + Array.from({length: 40}, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  } else if (currency.includes('sol')) {
    // Solana address (44 chars base58)
    address = Array.from({length: 44}, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join('');
  } else if (currency.includes('trx') || currency.includes('trc20')) {
    // TRON address (34 chars, starts with T)
    address = 'T' + Array.from({length: 33}, () => '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]).join('');
  } else {
    // Default EVM address
    address = '0x' + Array.from({length: 40}, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  }
  
  return {
    payment_id: `mock-${Date.now()}`,
    payment_status: "waiting",
    pay_address: address,
    pay_amount: amount,
    pay_currency: currency,
    order_id: `order-${Date.now()}`,
    valid_until: new Date(Date.now() + 3600000).toISOString(),
  };
}
