"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Loader2, AlertCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPayment, getPaymentStatus, SUPPORTED_CRYPTO, createMockPayment } from "@/lib/nowpayments";
import { playPaymentSuccess } from "@/lib/audio";

interface PaymentData {
  id: string;
  address: string;
  amount: number;
  currency: string;
  status: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    agentName: string;
    purpose: string;
    features: string[];
    tier: "starter" | "pro" | "enterprise";
  };
  sessionId: string;
  onSuccess: () => void;
}

const PRICES = {
  starter: 29,
  pro: 99,
  enterprise: 299,
};

export function PaymentModal({ isOpen, onClose, config, sessionId, onSuccess }: PaymentModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState("usdt");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"selecting" | "creating" | "waiting" | "confirming" | "confirmed" | "error">("selecting");
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus("selecting");
      setPayment(null);
      setError(null);
      setTimeLeft(3600);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (status === "waiting" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, timeLeft]);

  // Poll for payment status
  useEffect(() => {
    if (!payment || status !== "waiting") return;

    const interval = setInterval(async () => {
      try {
        // For demo mode, auto-confirm after 10 seconds
        if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
          if (timeLeft < 3590) {
            setStatus("confirming");
            playPaymentSuccess();
            setTimeout(() => {
              setStatus("confirmed");
              setTimeout(onSuccess, 1000);
            }, 1500);
          }
          return;
        }

        const data = await getPaymentStatus(payment.id);
        
        if (data.payment_status === "finished" || data.payment_status === "confirmed") {
          setStatus("confirmed");
          playPaymentSuccess();
          setTimeout(onSuccess, 1000);
          clearInterval(interval);
        } else if (data.payment_status === "failed" || data.payment_status === "expired") {
          setStatus("error");
          setError("Payment failed or expired. Please try again.");
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Payment check failed:", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [payment, status, timeLeft, onSuccess]);

  const createNewPayment = useCallback(async () => {
    setStatus("creating");
    setError(null);

    try {
      const amount = PRICES[config.tier];
      
      // Check if we're in demo mode or missing API keys
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NOWPAYMENTS_API_KEY) {
        // Simulate payment creation
        await new Promise(resolve => setTimeout(resolve, 1500));
        const mockPayment = createMockPayment(amount, selectedCurrency);
        setPayment({
          id: mockPayment.payment_id,
          address: mockPayment.pay_address,
          amount: mockPayment.pay_amount,
          currency: selectedCurrency,
          status: "waiting",
        });
        setStatus("waiting");
        return;
      }

      const response = await createPayment({
        price_amount: amount,
        price_currency: "usd",
        pay_currency: selectedCurrency,
        order_id: `${sessionId}-${Date.now()}`,
        order_description: `Deploy ${config.agentName} (${config.tier} tier)`,
      });

      setPayment({
        id: response.payment_id,
        address: response.pay_address,
        amount: response.pay_amount,
        currency: response.pay_currency,
        status: response.payment_status,
      });
      setStatus("waiting");
    } catch (e: any) {
      setError(e.message || "Failed to create payment");
      setStatus("error");
    }
  }, [config.tier, config.agentName, selectedCurrency, sessionId]);

  const copyAddress = useCallback(() => {
    if (payment?.address) {
      navigator.clipboard.writeText(payment.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [payment?.address]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const selectedCrypto = SUPPORTED_CRYPTO.find(c => c.code === selectedCurrency);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-gradient-to-r from-[#0ea5e9]/10 to-transparent">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-[#0ea5e9]" />
                <div>
                  <h3 className="font-semibold">PAYMENT</h3>
                  <p className="text-xs text-[var(--muted)] font-mono">{config.agentName} // {config.tier.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[var(--card-hover)] rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-[var(--muted)]" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Amount Display */}
              <div className="text-center py-4 bg-gradient-to-b from-[var(--card)] to-transparent rounded-xl border border-[var(--border)]">
                <span className="text-4xl font-bold text-[#0ea5e9]">${PRICES[config.tier]}</span>
                <span className="text-[var(--muted)] text-sm">/month</span>
              </div>

              {/* Currency Selection */}
              {status === "selecting" && (
                <div className="space-y-3">
                  <label className="text-xs font-mono text-[var(--muted)]">SELECT CRYPTOCURRENCY</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUPPORTED_CRYPTO.slice(0, 6).map((crypto) => (
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
                        <div className="text-left">
                          <p className="text-xs font-semibold">{crypto.name}</p>
                          <p className="text-[10px] text-[var(--muted)]">{crypto.network}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  
                  <Button
                    onClick={createNewPayment}
                    className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-12"
                  >
                    PROCEED TO PAYMENT
                  </Button>
                </div>
              )}

              {/* Creating */}
              {status === "creating" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-8 h-8 text-[#0ea5e9] animate-spin" />
                  <p className="text-sm text-[var(--muted)] font-mono">GENERATING PAYMENT ADDRESS...</p>
                </div>
              )}

              {/* Waiting for Payment */}
              {status === "waiting" && payment && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400 font-mono text-center">
                      AWAITING PAYMENT // EXPIRES IN {formatTime(timeLeft)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-[var(--muted)]">SEND {selectedCrypto?.name.toUpperCase()} TO:</label>
                    <div className="flex gap-2">
                      <Input
                        value={payment.address}
                        readOnly
                        className="flex-1 bg-[var(--card)] border-[var(--border)] text-xs font-mono h-12"
                      />
                      <Button
                        onClick={copyAddress}
                        size="sm"
                        className="h-12 w-12 p-0 bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--card-hover)]"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--muted)]">Amount:</span>
                      <span className="font-mono">{payment.amount} {selectedCrypto?.code.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Network:</span>
                      <span className="font-mono">{selectedCrypto?.network}</span>
                    </div>
                  </div>

                  <div className="text-xs text-[var(--muted)] text-center">
                    Payment will be detected automatically.
                  </div>
                </div>
              )}

              {/* Confirming */}
              {status === "confirming" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                  <p className="text-sm text-green-400 font-mono">CONFIRMING PAYMENT...</p>
                </div>
              )}

              {/* Confirmed */}
              {status === "confirmed" && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-lg font-semibold text-green-400">PAYMENT CONFIRMED</p>
                  <p className="text-xs text-[var(--muted)] font-mono">DEPLOYING YOUR AGENT...</p>
                </motion.div>
              )}

              {/* Error */}
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
