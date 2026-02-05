"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Loader2, AlertCircle, Wallet, Sparkles, Search, ChevronDown, Shield, Clock, Zap, Gift } from "lucide-react";
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
    agentType?: string;
    purpose: string;
    features: string[];
  };
  sessionId: string;
  onSuccess: () => void;
}

const SETUP_PRICE = 150;
const DAILY_PRICE = 5;

// Extended crypto list with search support
const ALL_CRYPTOS = [
  ...SUPPORTED_CRYPTO,
  { code: "ltc", name: "Litecoin", icon: "Ł", network: "Litecoin" },
  { code: "xrp", name: "Ripple", icon: "✕", network: "Ripple" },
  { code: "ada", name: "Cardano", icon: "₳", network: "Cardano" },
  { code: "doge", name: "Dogecoin", icon: "Ð", network: "Dogecoin" },
  { code: "xmr", name: "Monero", icon: "ɱ", network: "Monero" },
  { code: "link", name: "Chainlink", icon: "⬡", network: "ERC20" },
  { code: "uni", name: "Uniswap", icon: "🦄", network: "ERC20" },
  { code: "avax", name: "Avalanche", icon: "⬡", network: "AVAX" },
  { code: "ftm", name: "Fantom", icon: "👻", network: "Fantom" },
  { code: "cro", name: "Cronos", icon: "C", network: "Cronos" },
  { code: "near", name: "NEAR Protocol", icon: "N", network: "NEAR" },
  { code: "algo", name: "Algorand", icon: "A", network: "Algorand" },
];

const TRUST_BADGES = [
  { icon: Shield, text: "Secure Payment" },
  { icon: Clock, text: "15-30 Min Build" },
  { icon: Zap, text: "Live Progress" },
  { icon: Gift, text: "1 Month Included" },
];

export function PaymentModal({ isOpen, onClose, config, sessionId, onSuccess }: PaymentModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState("usdt");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"selecting" | "creating" | "waiting" | "confirming" | "confirmed" | "error">("selecting");
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(3600);

  const popularCryptos = useMemo(() => ALL_CRYPTOS.slice(0, 6), []);
  
  const filteredCryptos = useMemo(() => {
    if (!searchQuery) return ALL_CRYPTOS;
    const query = searchQuery.toLowerCase();
    return ALL_CRYPTOS.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query) ||
      c.network.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setStatus("selecting");
      setPayment(null);
      setError(null);
      setTimeLeft(3600);
      setSearchQuery("");
      setShowAllCurrencies(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (status === "waiting" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [status, timeLeft]);

  useEffect(() => {
    if (!payment || status !== "waiting") return;
    const interval = setInterval(async () => {
      try {
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
        if (["finished", "confirmed"].includes(data.payment_status)) {
          setStatus("confirmed");
          playPaymentSuccess();
          setTimeout(onSuccess, 1000);
          clearInterval(interval);
        } else if (["failed", "expired"].includes(data.payment_status)) {
          setStatus("error");
          setError("Payment failed or expired.");
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
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NOWPAYMENTS_API_KEY) {
        await new Promise(r => setTimeout(r, 1500));
        const mock = createMockPayment(SETUP_PRICE, selectedCurrency);
        setPayment({ id: mock.payment_id, address: mock.pay_address, amount: mock.pay_amount, currency: selectedCurrency, status: "waiting" });
        setStatus("waiting");
        return;
      }
      const response = await createPayment({
        price_amount: SETUP_PRICE,
        price_currency: "usd",
        pay_currency: selectedCurrency,
        order_id: `${sessionId}-${Date.now()}`,
        order_description: `Deploy ${config.agentName}`,
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
  }, [config.agentName, selectedCurrency, sessionId]);

  const copyAddress = useCallback(() => {
    if (payment?.address) {
      navigator.clipboard.writeText(payment.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [payment?.address]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const selectedCrypto = ALL_CRYPTOS.find(c => c.code === selectedCurrency);
  const savings = Math.round((SETUP_PRICE / 30 - DAILY_PRICE) * 30);

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
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-gradient-to-r from-[#0ea5e9]/10 via-purple-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0ea5e9] to-purple-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Complete Your Order</h3>
                  <p className="text-xs text-[var(--muted)] font-mono">Secure crypto checkout</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[var(--card-hover)] rounded-lg transition-colors">
                <X className="w-5 h-5 text-[var(--muted)]" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
              {/* Price Hero */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0ea5e9] via-purple-600 to-[#0ea5e9] p-6 text-white">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
                <div className="relative">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-bold">${SETUP_PRICE}</span>
                    <span className="text-lg opacity-80">one-time</span>
                  </div>
                  <p className="text-sm opacity-90">That's just ${DAILY_PRICE}/day for your personal AI</p>
                  <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-xs font-medium">
                    <Sparkles className="w-3 h-3" />
                    Save ${savings} vs monthly plans
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-2">
                {TRUST_BADGES.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div key={badge.text} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                      <Icon className="w-4 h-4 text-[#0ea5e9]" />
                      <span className="text-xs font-medium">{badge.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* What's Included */}
              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4">
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">What You Get</p>
                <ul className="space-y-2">
                  {[
                    `${config.agentName} - ${config.agentType || 'Custom AI Agent'}`,
                    `${config.features.length} superpowers enabled`,
                    "Full source code ownership",
                    "1 month monitoring & support",
                    "Built by Devin AI (watch live)",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Currency Selection */}
              {status === "selecting" && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                    Pay with Crypto
                  </label>
                  
                  {/* Popular cryptos */}
                  <div className="grid grid-cols-3 gap-2">
                    {popularCryptos.map((crypto) => (
                      <motion.button
                        key={crypto.code}
                        onClick={() => setSelectedCurrency(crypto.code)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                          selectedCurrency === crypto.code
                            ? "bg-[#0ea5e9]/10 border-[#0ea5e9] ring-1 ring-[#0ea5e9]"
                            : "bg-[var(--card)] border-[var(--border)] hover:border-[#0ea5e9]/50"
                        }`}
                      >
                        <span className="text-2xl mb-1">{crypto.icon}</span>
                        <span className="text-xs font-semibold">{crypto.code.toUpperCase()}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Show more / Search */}
                  {!showAllCurrencies ? (
                    <button
                      onClick={() => setShowAllCurrencies(true)}
                      className="w-full py-2 flex items-center justify-center gap-2 text-sm text-[var(--muted)] hover:text-[#0ea5e9] transition-colors border border-dashed border-[var(--border)] rounded-lg"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Show {ALL_CRYPTOS.length - 6}+ more currencies
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search currencies..."
                          className="pl-9 bg-[var(--card)] border-[var(--border)]"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                        {filteredCryptos.map((crypto) => (
                          <motion.button
                            key={crypto.code}
                            onClick={() => setSelectedCurrency(crypto.code)}
                            whileHover={{ scale: 1.02 }}
                            className={`flex flex-col items-center p-2 rounded-lg border transition-all ${
                              selectedCurrency === crypto.code
                                ? "bg-[#0ea5e9]/10 border-[#0ea5e9]"
                                : "bg-[var(--card)] border-[var(--border)]"
                            }`}
                          >
                            <span className="text-lg">{crypto.icon}</span>
                            <span className="text-[10px] font-medium">{crypto.code.toUpperCase()}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Selected display */}
                  {selectedCrypto && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedCrypto.icon}</span>
                        <div>
                          <p className="font-medium">{selectedCrypto.name}</p>
                          <p className="text-xs text-[var(--muted)]">{selectedCrypto.network}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-medium">≈ ${SETUP_PRICE}</p>
                        <p className="text-xs text-[var(--muted)]">No extra fees</p>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={createNewPayment}
                    className="w-full bg-gradient-to-r from-[#0ea5e9] to-purple-600 hover:from-[#0284c7] hover:to-purple-700 text-white h-14 text-lg font-semibold shadow-lg shadow-[#0ea5e9]/25"
                  >
                    Pay with {selectedCrypto?.name || 'Crypto'}
                  </Button>
                  <p className="text-center text-xs text-[var(--muted)]">
                    By proceeding, you agree to our Terms of Service
                  </p>
                </div>
              )}

              {/* Creating */}
              {status === "creating" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-10 h-10 text-[#0ea5e9] animate-spin" />
                  <p className="text-sm text-[var(--muted)] font-mono">Generating secure payment address...</p>
                </div>
              )}

              {/* Waiting for Payment */}
              {status === "waiting" && payment && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400 font-mono text-center">
                      ⏱ AWAITING PAYMENT // EXPIRES IN {formatTime(timeLeft)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-[var(--muted)]">SEND {selectedCrypto?.name.toUpperCase()} TO:</label>
                    <div className="flex gap-2">
                      <Input value={payment.address} readOnly className="flex-1 bg-[var(--card)] border-[var(--border)] text-xs font-mono h-12" />
                      <Button onClick={copyAddress} size="sm" className="h-12 w-12 p-0 bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--card-hover)]">
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-[var(--card)] rounded-xl border border-[var(--border)] space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Amount:</span>
                      <span className="font-mono font-medium">{payment.amount} {selectedCrypto?.code.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">Network:</span>
                      <span className="font-mono">{selectedCrypto?.network}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--muted)] text-center">
                    Payment will be detected automatically. Keep this window open.
                  </p>
                </div>
              )}

              {/* Confirming */}
              {status === "confirming" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
                  <p className="text-lg text-green-400 font-medium">Confirming Payment...</p>
                </div>
              )}

              {/* Confirmed */}
              {status === "confirmed" && (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4 py-8">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30"
                  >
                    <Check className="w-10 h-10 text-white" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-400">Payment Confirmed!</p>
                    <p className="text-sm text-[var(--muted)]">Your AI agent is being built...</p>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
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
