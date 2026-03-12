"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bot,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Wallet,
  MessageCircle,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { playPaymentSuccess } from "@/lib/audio";

interface PaymentData {
  id: string;
  provider: "nowpayments" | "dodo";
  paymentMethodType: "crypto" | "card" | null;
  address?: string | null;
  amount: number;
  currency: string;
  status: string;
  checkoutUrl?: string | null;
  expiresAt?: string | Date | null;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    agentName: string;
    useCase: string;
    scope: string;
    contactMethod: string;
    telegramBotUsername?: string;
  };
  launchOffer: "monthly" | "day_pass";
  agentId: string | null;
  onSuccess: () => void;
}

const MONTHLY_PLAN_PRICE = 150;
const DAY_PASS_PRICE = 5;

interface CryptoOption {
  code: string;
  name: string;
  icon: string;
  network?: string;
}

const ALL_CRYPTO_OPTIONS: CryptoOption[] = [
  { code: "usdt", name: "USDT", icon: "💵", network: "TRC20" },
  { code: "usdterc20", name: "USDT", icon: "💵", network: "ERC20" },
  { code: "usdtbsc", name: "USDT", icon: "💵", network: "BSC" },
  { code: "usdtsol", name: "USDT", icon: "💵", network: "Solana" },
  { code: "usdc", name: "USDC", icon: "💰", network: "Base" },
  { code: "usdccsol", name: "USDC", icon: "💰", network: "Solana" },
  { code: "usdcarb", name: "USDC", icon: "💰", network: "Arbitrum" },
];

type PaymentMethod = "card" | "crypto";
type ModalStatus =
  | "selecting"
  | "creating"
  | "waiting"
  | "confirming"
  | "confirmed"
  | "error";

function formatTimeLeft(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getSecondsUntilExpiry(expiresAt?: string | Date | null): number {
  if (!expiresAt) {
    return 3600;
  }

  const target = new Date(expiresAt).getTime();
  if (!Number.isFinite(target)) {
    return 3600;
  }

  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

export function PaymentModal({
  isOpen,
  onClose,
  config,
  launchOffer,
  agentId,
  onSuccess,
}: PaymentModalProps) {
  const { getAccessToken } = usePrivy();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [selectedCurrency, setSelectedCurrency] = useState("usdt");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<ModalStatus>("selecting");
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600);

  const isDayPass = launchOffer === "day_pass";
  const displayPrice = isDayPass ? DAY_PASS_PRICE : MONTHLY_PLAN_PRICE;

  useEffect(() => {
    if (isOpen) {
      setSelectedMethod("card");
      setSelectedCurrency("usdt");
      setStatus("selecting");
      setPayment(null);
      setError(null);
      setCheckoutNotice(null);
      setTimeLeft(3600);
    }
  }, [isOpen]);

  useEffect(() => {
    if (status !== "waiting") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus("error");
          setError("Payment expired. Please try again.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!payment || status !== "waiting") return;

    const interval = setInterval(async () => {
      try {
        const token = await getAccessToken();
        const response = await fetch(`/api/payment/status?paymentId=${payment.id}`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
        });
        if (!response.ok) return;

        const data = await response.json();
        if (data.status === "confirmed") {
          setStatus("confirmed");
          playPaymentSuccess();
          setTimeout(onSuccess, 1000);
          clearInterval(interval);
        } else if (data.status === "failed") {
          setStatus("error");
          setError("Payment failed or expired.");
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Payment check failed:", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [payment, status, onSuccess, getAccessToken]);

  const openCheckoutWindow = useCallback((checkoutUrl: string) => {
    const opened = window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      setCheckoutNotice("Popup blocked. Use the secure checkout button below.");
      return;
    }
    setCheckoutNotice("Secure checkout opened in a new tab.");
  }, []);

  const createNewPayment = useCallback(async () => {
    if (!agentId) {
      setError("No agent selected. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("creating");
    setError(null);
    setCheckoutNotice(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Not authenticated. Please refresh the page.");
        setStatus("error");
        return;
      }

      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId,
          provider: selectedMethod === "card" ? "dodo" : "nowpayments",
          paymentMethod: selectedMethod,
          currency: selectedMethod === "crypto" ? selectedCurrency : undefined,
          purchaseType: isDayPass ? "day_pass" : "subscription",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Payment creation failed");
      }

      const data = await response.json();
      const nextPayment: PaymentData = {
        id: data.payment.id,
        provider: data.payment.provider,
        paymentMethodType: data.payment.paymentMethodType ?? null,
        address: data.payment.address ?? null,
        amount: data.payment.amount,
        currency: data.payment.currency,
        status: data.payment.status,
        checkoutUrl: data.payment.checkoutUrl ?? null,
        expiresAt: data.payment.expiresAt ?? null,
      };
      setPayment(nextPayment);
      setTimeLeft(getSecondsUntilExpiry(nextPayment.expiresAt));
      setStatus("waiting");

      if (nextPayment.provider === "dodo" && nextPayment.checkoutUrl) {
        openCheckoutWindow(nextPayment.checkoutUrl);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create payment";
      setError(message);
      setStatus("error");
    }
  }, [agentId, isDayPass, selectedCurrency, selectedMethod, getAccessToken, openCheckoutWindow]);

  const copyAddress = useCallback(() => {
    if (payment?.address) {
      navigator.clipboard.writeText(payment.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [payment?.address]);

  const selectedCrypto = ALL_CRYPTO_OPTIONS.find((c) => c.code === selectedCurrency);
  const isCardPayment = payment?.provider === "dodo" || selectedMethod === "card";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm safe-area-padding"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="brand-panel brand-noise w-full max-w-md overflow-hidden rounded-[1.8rem] shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-gradient-to-r from-[#ff6835]/14 to-transparent p-4">
              <div className="flex items-center gap-3">
                {isCardPayment ? (
                  <CreditCard className="w-5 h-5 text-[#ff8a53]" />
                ) : (
                  <Wallet className="w-5 h-5 text-[#ff8a53]" />
                )}
                <div>
                  <h3 className="font-semibold">Payment</h3>
                  <p className="text-xs text-[var(--muted)] font-mono">{config.agentName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[var(--card-hover)] rounded-lg transition-colors">
                <X className="w-4 h-4 text-[var(--muted)]" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="brand-panel rounded-2xl py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-[#ff8a53]">${displayPrice}</span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {isDayPass ? "24-hour access" : "First month"}
                </p>
              </div>

              <div className="brand-panel rounded-2xl p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#ff8a53]" />
                  <span className="text-[var(--muted)]">Contact:</span>
                  <span className="capitalize">{config.contactMethod}</span>
                </div>
                {config.telegramBotUsername ? (
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#ff8a53]" />
                    <span className="text-[var(--muted)]">Bot:</span>
                    <span>@{config.telegramBotUsername}</span>
                  </div>
                ) : null}
              </div>

              {status === "selecting" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-[var(--muted)]">PAYMENT METHOD</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMethod("card")}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          selectedMethod === "card"
                            ? "bg-[#ff8a53]/20 border-[#ff8a53] text-[#ffd3a7]"
                            : "bg-[var(--card)] border-[var(--border)] hover:border-[#ff8a53]/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span className="text-sm font-semibold">Card</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          Secure hosted checkout via Dodo
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedMethod("crypto")}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          selectedMethod === "crypto"
                            ? "bg-[#ff8a53]/20 border-[#ff8a53] text-[#ffd3a7]"
                            : "bg-[var(--card)] border-[var(--border)] hover:border-[#ff8a53]/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          <span className="text-sm font-semibold">Crypto</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">
                          USDT / USDC via NowPayments
                        </p>
                      </button>
                    </div>
                  </div>

                  {selectedMethod === "crypto" ? (
                    <div className="space-y-3">
                      <label className="text-xs font-mono text-[var(--muted)]">SELECT CRYPTOCURRENCY</label>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_CRYPTO_OPTIONS.map((crypto) => (
                          <motion.button
                            key={crypto.code}
                            onClick={() => setSelectedCurrency(crypto.code)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                              selectedCurrency === crypto.code
                                ? "bg-[#ff8a53]/20 border-[#ff8a53] text-[#ffd3a7]"
                                : "bg-[var(--card)] border-[var(--border)] hover:border-[#ff8a53]/50"
                            }`}
                          >
                            <span className="text-lg">{crypto.icon}</span>
                            <div className="text-left flex-1">
                              <p className="text-xs font-semibold">{crypto.name}</p>
                              {crypto.network && (
                                <p className="text-[10px] text-[var(--muted)]">{crypto.network}</p>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="brand-panel rounded-2xl p-4 text-sm text-[var(--muted)]">
                      <p className="text-white">Card checkout opens in a secure hosted page.</p>
                      <p className="mt-2">
                        Complete payment there and keep this window open. We&apos;ll activate the agent automatically when confirmation arrives.
                      </p>
                    </div>
                  )}

                  <Button onClick={createNewPayment} className="brand-button h-12 w-full border-0 text-white hover:opacity-95">
                    {selectedMethod === "card" ? "PROCEED TO SECURE CHECKOUT" : "GENERATE CRYPTO PAYMENT"}
                  </Button>
                </div>
              )}

              {status === "creating" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-8 h-8 text-[#ff8a53] animate-spin" />
                  <p className="text-sm text-[var(--muted)] font-mono">
                    {selectedMethod === "card" ? "PREPARING CHECKOUT..." : "GENERATING ADDRESS..."}
                  </p>
                </div>
              )}

              {status === "waiting" && payment && payment.provider === "dodo" && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400 font-mono text-center">AWAITING CARD CHECKOUT</p>
                    <p className="mt-1 text-[10px] text-amber-300/90 font-mono text-center">
                      Expires in {formatTimeLeft(timeLeft)}
                    </p>
                  </div>

                  <div className="brand-panel rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted)]">Amount</span>
                      <span className="font-mono">${payment.amount.toFixed(2)} {payment.currency}</span>
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      Complete the secure card checkout in the hosted Dodo page. Matt will start activating automatically after confirmation.
                    </p>
                    {payment.checkoutUrl ? (
                      <Button
                        onClick={() => openCheckoutWindow(payment.checkoutUrl!)}
                        className="brand-button w-full border-0 text-white hover:opacity-95"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        OPEN SECURE CHECKOUT
                      </Button>
                    ) : null}
                    {checkoutNotice ? (
                      <p className="text-xs text-[var(--muted)]">{checkoutNotice}</p>
                    ) : null}
                  </div>
                </div>
              )}

              {status === "waiting" && payment && payment.provider === "nowpayments" && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400 font-mono text-center">AWAITING PAYMENT</p>
                    <p className="mt-1 text-[10px] text-amber-300/90 font-mono text-center">
                      Expires in {formatTimeLeft(timeLeft)}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.address ?? "")}`}
                      alt="Payment QR Code"
                      className="rounded-lg border border-[var(--border)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-[var(--muted)]">SEND {selectedCrypto?.name.toUpperCase()} TO:</label>
                    <div className="flex gap-2">
                      <textarea
                        value={payment.address ?? ""}
                        readOnly
                        rows={3}
                        className="brand-button-secondary flex-1 resize-none rounded-xl p-3 text-xs font-mono break-all"
                      />
                      <Button onClick={copyAddress} size="sm" className="brand-button-secondary h-auto w-12 p-0 hover:bg-[var(--card-hover)]">
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="brand-panel rounded-2xl p-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--muted)]">Amount:</span>
                      <span className="font-mono">{payment.amount} {selectedCrypto?.code.toUpperCase()}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--muted)] text-center">
                    Funds will be automatically transferred after confirmation.
                  </p>
                </div>
              )}

              {status === "confirming" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                  <p className="text-sm text-green-400 font-mono">CONFIRMING...</p>
                </div>
              )}

              {status === "confirmed" && (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-lg font-semibold text-green-400">CONFIRMED</p>
                </motion.div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
