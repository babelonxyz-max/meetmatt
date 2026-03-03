"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Loader2, AlertCircle, Wallet, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playPaymentSuccess } from "@/lib/audio";

interface PaymentData {
  id: string;
  address: string;
  amount: number;
  currency: string;
  status: string;
  network?: string;
  discount?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    agentName: string;
    useCase: string;
    scope: string;
    contactMethod: string;
  };
  agentId: string | null;
  onSuccess: () => void;
}

const PLAN_PRICE = 150;

interface CryptoOption {
  code: string;
  name: string;
  icon: string;
  network?: string;
  discount?: string;
}

const ALL_CRYPTO_OPTIONS: CryptoOption[] = [
  // USDT options
  { code: "usdt", name: "USDT", icon: "💵", network: "TRC20" },
  { code: "usdterc20", name: "USDT", icon: "💵", network: "ERC20" },
  { code: "usdtbsc", name: "USDT", icon: "💵", network: "BSC" },
  { code: "usdtsol", name: "USDT", icon: "💵", network: "Solana" },
  // USDC options
  { code: "usdc", name: "USDC", icon: "💰", network: "Base" },
  { code: "usdccsol", name: "USDC", icon: "💰", network: "Solana" },
  { code: "usdcarb", name: "USDC", icon: "💰", network: "Arbitrum" },
];

export function PaymentModal({ isOpen, onClose, config, agentId, onSuccess }: PaymentModalProps) {
  const { getAccessToken } = usePrivy();
  const [selectedCurrency, setSelectedCurrency] = useState("usdt");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"selecting" | "creating" | "waiting" | "confirming" | "confirmed" | "error">("selecting");
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600);

  const displayPrice = PLAN_PRICE;

  useEffect(() => {
    if (isOpen) {
      setStatus("selecting");
      setPayment(null);
      setError(null);
      setTimeLeft(3600);
    }
  }, [isOpen]);

  useEffect(() => {
    if (status === "waiting" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [status, timeLeft]);

  // Poll our /api/payment/status for payment confirmation (updated by IPN webhook)
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
  }, [payment, status, timeLeft, onSuccess, getAccessToken]);

  const createNewPayment = useCallback(async () => {
    if (!agentId) {
      setError("No agent selected. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("creating");
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Not authenticated. Please refresh the page.");
        setStatus("error");
        return;
      }

      // Use /api/payment/create — stores DB record + sets IPN callback URL
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId,
          currency: selectedCurrency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Payment creation failed");
      }

      const data = await response.json();
      setPayment({
        id: data.payment.id,
        address: data.payment.address,
        amount: data.payment.amount,
        currency: data.payment.currency,
        status: data.payment.status,
      });
      setStatus("waiting");
    } catch (e: any) {
      setError(e.message || "Failed to create payment");
      setStatus("error");
    }
  }, [agentId, selectedCurrency, getAccessToken]);

  const copyAddress = useCallback(() => {
    if (payment?.address) {
      navigator.clipboard.writeText(payment.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [payment?.address]);

  const selectedCrypto = ALL_CRYPTO_OPTIONS.find((c) => c.code === selectedCurrency);

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
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-gradient-to-r from-[#0ea5e9]/10 to-transparent">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-[#0ea5e9]" />
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
              <div className="text-center py-4 bg-gradient-to-b from-[var(--card)] to-transparent rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-[#0ea5e9]">${displayPrice}</span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">First month</p>
              </div>

              <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)] text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#0ea5e9]" />
                  <span className="text-[var(--muted)]">Contact:</span>
                  <span className="capitalize">{config.contactMethod}</span>
                </div>
              </div>

              {status === "selecting" && (
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
                            ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]"
                            : "bg-[var(--card)] border-[var(--border)] hover:border-[#0ea5e9]/50"
                        }`}
                      >
                        <span className="text-lg">{crypto.icon}</span>
                        <div className="text-left flex-1">
                          <p className="text-xs font-semibold">{crypto.name}</p>
                          {crypto.network && (
                            <p className="text-[10px] text-[var(--muted)]">{crypto.network}</p>
                          )}
                        </div>
                        {crypto.discount && <Zap className="w-3 h-3 text-green-400" />}
                      </motion.button>
                    ))}
                  </div>

                  <Button onClick={createNewPayment} className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-12">
                    PROCEED TO PAYMENT
                  </Button>
                </div>
              )}

              {status === "creating" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-8 h-8 text-[#0ea5e9] animate-spin" />
                  <p className="text-sm text-[var(--muted)] font-mono">GENERATING ADDRESS...</p>
                </div>
              )}

              {status === "waiting" && payment && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400 font-mono text-center">AWAITING PAYMENT</p>
                  </div>

                  {payment.network && (
                    <div className="p-2 bg-[#0ea5e9]/10 rounded-lg text-center">
                      <p className="text-xs text-[#0ea5e9]">Network: {payment.network}</p>
                    </div>
                  )}

                  {/* QR Code */}
                  <div className="flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.address)}`}
                      alt="Payment QR Code"
                      className="rounded-lg border border-[var(--border)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-[var(--muted)]">SEND {selectedCrypto?.name.toUpperCase()} TO:</label>
                    <div className="flex gap-2">
                      <textarea
                        value={payment.address}
                        readOnly
                        rows={3}
                        className="flex-1 bg-[var(--card)] border border-[var(--border)] text-xs font-mono p-3 rounded-lg resize-none break-all"
                      />
                      <Button onClick={copyAddress} size="sm" className="h-auto w-12 p-0 bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--card-hover)]">
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--muted)]">Amount:</span>
                      <span className="font-mono">{payment.amount} {selectedCrypto?.code.toUpperCase()}</span>
                    </div>
                    {payment.discount && (
                      <div className="flex justify-between text-xs">
                        <span className="text-green-400">Discount:</span>
                        <span className="text-green-400">{payment.discount}</span>
                      </div>
                    )}
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
