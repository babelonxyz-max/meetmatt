"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Loader2, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PaymentData {
  id: string;
  address: string;
  amount: number;
  currency: string;
  isDemo?: boolean;
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

const CURRENCIES = [
  { code: "USDT_BSC", name: "USDT", chain: "BSC", icon: "💎" },
  { code: "USDT_SOL", name: "USDT", chain: "Solana", icon: "💎" },
  { code: "USDT_TRON", name: "USDT", chain: "TRON", icon: "💎" },
  { code: "USDC_BASE", name: "USDC", chain: "Base", icon: "💵" },
  { code: "USDC_SOL", name: "USDC", chain: "Solana", icon: "💵" },
];

export function PaymentModal({ isOpen, onClose, config, sessionId, onSuccess }: PaymentModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState("USDT_BSC");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"pending" | "checking" | "confirmed" | "demo">("pending");
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !payment) {
      createPayment();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!payment || status === "confirmed" || status === "demo") return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment?id=${payment.id}`);
        const data = await response.json();
        
        if (data.status === "confirmed") {
          setStatus("confirmed");
          setTimeout(() => onSuccess(), 1500);
        }
      } catch (e) {
        console.error("Payment check failed:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [payment, status, onSuccess]);

  const createPayment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tier: config.tier,
          currency: selectedCurrency,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create payment");
      }

      const data = await response.json();
      setPayment(data);
      setStatus(data.isDemo ? "demo" : "pending");
      
      if (data.isDemo) {
        setTimeout(() => {
          setStatus("confirmed");
          setTimeout(() => onSuccess(), 1000);
        }, 3000);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    if (payment?.address) {
      navigator.clipboard.writeText(payment.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getCurrencyInfo = (code: string) => CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div>
                <h3 className="font-semibold text-white">Complete Payment</h3>
                <p className="text-xs text-zinc-500">
                  Deploy {config.agentName} - {config.tier} tier
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Demo mode banner */}
            {status === "demo" && (
              <div className="px-4 pt-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium">Demo Mode</p>
                    <p className="text-[11px] text-amber-400/70 mt-1">
                      This is a demo. Payments are simulated and auto-confirmed after 3 seconds.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* Price */}
              <div className="text-center py-3 bg-white/5 rounded-xl">
                <span className="text-3xl font-bold text-white">${PRICES[config.tier]}</span>
                <span className="text-zinc-500 text-sm">/mo</span>
              </div>

              {/* Currency selection */}
              {status === "pending" && !payment && (
                <div>
                  <label className="text-xs text-zinc-500 mb-2 block">Select currency</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CURRENCIES.map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => setSelectedCurrency(curr.code)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                          selectedCurrency === curr.code
                            ? "bg-[#0ea5e9]/10 border-[#0ea5e9]/30"
                            : "bg-white/5 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <span className="text-lg">{curr.icon}</span>
                        <div>
                          <p className="text-xs font-medium text-white">{curr.name}</p>
                          <p className="text-[10px] text-zinc-500">{curr.chain}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Payment details */}
              {payment && (
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-xs text-zinc-500">Status</span>
                    <span className={`text-xs font-medium flex items-center gap-1 ${
                      status === "confirmed" ? "text-green-400" : 
                      status === "demo" ? "text-amber-400" :
                      "text-[#0ea5e9]"
                    }`}>
                      {status === "confirmed" ? (
                        <><Check className="w-3 h-3" /> Confirmed</>
                      ) : status === "demo" ? (
                        <><Info className="w-3 h-3" /> Auto-confirming...</>
                      ) : (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Awaiting payment...</>
                      )}
                    </span>
                  </div>

                  {/* Address */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">Send to this address</span>
                      <span className="text-[10px] text-zinc-600">{getCurrencyInfo(payment.currency).chain}</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={payment.address}
                        readOnly
                        className="flex-1 bg-black/30 border-white/10 text-xs text-zinc-300 h-10"
                      />
                      <Button
                        onClick={copyAddress}
                        size="sm"
                        className="h-10 w-10 p-0 bg-white/5 hover:bg-white/10"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="p-3 bg-black/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Amount</span>
                      <span className="text-sm font-medium text-white">
                        ${PRICES[config.tier]} {getCurrencyInfo(payment.currency).name}
                      </span>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-2 text-[11px] text-zinc-500">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <p>Send only {getCurrencyInfo(payment.currency).name} on {getCurrencyInfo(payment.currency).chain} network.</p>
                  </div>
                </div>
              )}

              {/* Action button */}
              {!payment && (
                <Button
                  onClick={createPayment}
                  disabled={isLoading}
                  className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-11"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Get Payment Address"
                  )}
                </Button>
              )}

              {status === "confirmed" && (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  Payment confirmed!
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
