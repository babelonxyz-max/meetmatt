"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Loader2, AlertCircle, Wallet, MessageCircle, Zap, Clock, TrendingDown } from "lucide-react";
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

interface PricingOption {
  months: number;
  label: string;
  price: number;
  pricePerMonth: number;
  discountPercent: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    agentName: string;
    useCase?: string;
    scope?: string;
    contactMethod?: string;
  };
  sessionId: string;
  onSuccess: () => void;
  // Extension mode props
  mode?: "create" | "extend";
  agentId?: string;
  userId?: string;
  pricingOptions?: PricingOption[];
}

const DEFAULT_PLAN_PRICE = 150;
const DEFAULT_DISCOUNTED_PRICE = 135;

interface CryptoOption {
  code: string;
  name: string;
  icon: string;
  network?: string;
  discount?: string;
}

// Default crypto options - can be overridden via CMS settings
export const DEFAULT_CRYPTO_OPTIONS: CryptoOption[] = [
  { code: "usdh", name: "USDH", icon: "🏦", network: "HyperEVM", discount: "-10%" },
  { code: "usdt", name: "USDT", icon: "💵", network: "TRC20" },
  { code: "usdterc20", name: "USDT", icon: "💵", network: "ERC20" },
  { code: "usdtbsc", name: "USDT", icon: "💵", network: "BSC" },
  { code: "usdtsol", name: "USDT", icon: "💵", network: "Solana" },
  { code: "usdc", name: "USDC", icon: "💰", network: "Base" },
  { code: "usdccsol", name: "USDC", icon: "💰", network: "Solana" },
  { code: "usdcarb", name: "USDC", icon: "💰", network: "Arbitrum" },
];

// Format price display
const formatPrice = (price: number) => `$${price}`;

export function PaymentModal({ 
  isOpen, 
  onClose, 
  config, 
  sessionId, 
  onSuccess,
  mode = "create",
  agentId,
  userId,
  pricingOptions = []
}: PaymentModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState("usdh");
  const [selectedMonths, setSelectedMonths] = useState(pricingOptions[0]?.months || 1);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"selecting" | "creating" | "waiting" | "confirming" | "confirmed" | "error">("selecting");
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cryptoOptions, setCryptoOptions] = useState<CryptoOption[]>(DEFAULT_CRYPTO_OPTIONS);

  const isUSDH = selectedCurrency === "usdh";
  const isExtension = mode === "extend";
  
  // Calculate display price
  const getDisplayPrice = () => {
    if (isExtension) {
      const option = pricingOptions.find(o => o.months === selectedMonths);
      return option?.price || DEFAULT_PLAN_PRICE;
    }
    return isUSDH ? DEFAULT_DISCOUNTED_PRICE : DEFAULT_PLAN_PRICE;
  };

  const displayPrice = getDisplayPrice();

  // Load crypto options from CMS/settings
  useEffect(() => {
    const loadCryptoOptions = async () => {
      try {
        const response = await fetch("/api/control/crypto");
        if (response.ok) {
          const data = await response.json();
          // Filter only enabled options and map to the format we need
          const enabledOptions = data.options
            .filter((opt: any) => opt.enabled !== false)
            .map((opt: any) => ({
              code: opt.code,
              name: opt.name,
              icon: opt.icon,
              network: opt.network,
              discount: opt.discount,
            }));
          setCryptoOptions(enabledOptions.length > 0 ? enabledOptions : DEFAULT_CRYPTO_OPTIONS);
        } else {
          setCryptoOptions(DEFAULT_CRYPTO_OPTIONS);
        }
      } catch (error) {
        console.error("Failed to load crypto options:", error);
        setCryptoOptions(DEFAULT_CRYPTO_OPTIONS);
      }
    };

    loadCryptoOptions();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStatus("selecting");
      setPayment(null);
      setError(null);
      setSelectedMonths(pricingOptions[0]?.months || 1);
    }
  }, [isOpen, pricingOptions]);

  // Payment status polling
  useEffect(() => {
    if (!payment || status !== "waiting") return;

    const interval = setInterval(async () => {
      try {
        if (payment.currency === "usdh") {
          const response = await fetch(`/api/payment/usdh?sessionId=${sessionId}`);
          const data = await response.json();
          
          if (data.status === "transferred") {
            setStatus("confirming");
            playPaymentSuccess();
            setTimeout(() => {
              setStatus("confirmed");
              setTimeout(onSuccess, 1000);
            }, 1500);
            clearInterval(interval);
          }
          return;
        }

        const response = await fetch(`/api/payment/nowpayments?paymentId=${payment.id}`);
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.payment_status === "finished" || data.payment_status === "confirmed" || data.payment_status === "sending") {
          setStatus("confirmed");
          playPaymentSuccess();
          setTimeout(onSuccess, 1000);
          clearInterval(interval);
        } else if (data.payment_status === "failed" || data.payment_status === "expired") {
          setStatus("error");
          setError("Payment failed or expired.");
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Payment check failed:", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [payment, status, onSuccess, sessionId]);

  const createPayment = useCallback(async () => {
    setStatus("creating");
    setError(null);

    try {
      // USDH direct payment
      if (selectedCurrency === "usdh") {
        const PM_WALLET = "0x2cc517dACE1e0076211356edf0447c79a432449D";
        setPayment({
          id: `usdh-${sessionId}`,
          address: PM_WALLET,
          amount: displayPrice,
          currency: "usdh",
          status: "waiting",
          network: "HyperEVM",
          discount: "10%",
        });
        setStatus("waiting");
        return;
      }

      // Extension mode - use subscription/extend API
      if (isExtension && agentId && userId) {
        const response = await fetch("/api/subscription/extend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            userId,
            months: selectedMonths,
            currency: selectedCurrency,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Extension payment failed");
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
        return;
      }

      // Create mode - use payment/nowpayments API
      const response = await fetch("/api/payment/nowpayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_amount: DEFAULT_PLAN_PRICE,
          price_currency: "usd",
          pay_currency: selectedCurrency,
          order_id: `${sessionId}-${Date.now()}`,
          order_description: `Deploy ${config.agentName}`,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Payment creation failed");
      }

      const data = await response.json();
      setPayment({
        id: data.payment_id,
        address: data.pay_address,
        amount: data.pay_amount,
        currency: data.pay_currency,
        status: data.payment_status,
      });
      setStatus("waiting");
    } catch (e: any) {
      setError(e.message || "Failed to create payment");
      setStatus("error");
    }
  }, [selectedCurrency, displayPrice, isExtension, agentId, userId, selectedMonths, config.agentName, sessionId]);

  const copyAddress = useCallback(() => {
    if (payment?.address) {
      navigator.clipboard.writeText(payment.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [payment?.address]);

  const selectedCrypto = cryptoOptions.find((c) => c.code === selectedCurrency);
  const currentPricing = pricingOptions.find(o => o.months === selectedMonths);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm safe-area-padding"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-gradient-to-r from-blue-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-[#0ea5e9]" />
                <div>
                  <h3 className="font-semibold text-white">
                    {isExtension ? "Extend Subscription" : "Payment"}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">{config.agentName}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Price Display */}
              <div className="text-center py-4 bg-gradient-to-b from-zinc-800/50 to-transparent rounded-xl border border-zinc-800">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-[#0ea5e9]">${displayPrice}</span>
                  {isUSDH && !isExtension && (
                    <span className="text-sm text-green-400 bg-green-400/10 px-2 py-1 rounded-full">-10%</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {isExtension 
                    ? `${selectedMonths} month${selectedMonths > 1 ? 's' : ''} extension`
                    : "First month"}
                  {isUSDH && !isExtension && <span className="text-green-400 ml-1">(Save $15 with USDH)</span>}
                </p>
              </div>

              {/* Contact Method (create mode only) */}
              {!isExtension && config.contactMethod && (
                <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-800 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#0ea5e9]" />
                    <span className="text-zinc-400">Contact:</span>
                    <span className="capitalize text-white">{config.contactMethod}</span>
                  </div>
                </div>
              )}

              {/* Duration Selector (extension mode only) */}
              {isExtension && pricingOptions.length > 0 && status === "selecting" && (
                <div className="space-y-3">
                  <label className="text-xs font-mono text-zinc-500">SELECT DURATION</label>
                  <div className="grid grid-cols-2 gap-2">
                    {pricingOptions.map((option) => (
                      <motion.button
                        key={option.months}
                        onClick={() => setSelectedMonths(option.months)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative p-3 rounded-lg border transition-all text-left ${
                          selectedMonths === option.months
                            ? "bg-blue-500/20 border-blue-500 text-blue-400"
                            : "bg-zinc-800/50 border-zinc-700 hover:border-blue-500/50"
                        }`}
                      >
                        <p className="text-xs font-semibold text-white">{option.label}</p>
                        <p className="text-[10px] text-zinc-400">{formatPrice(option.price)}</p>
                        {option.discountPercent > 0 && (
                          <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold rounded-full bg-green-500 text-white">
                            -{option.discountPercent}%
                          </span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                  
                  {/* Price Breakdown */}
                  {currentPricing && (
                    <div className="p-3 bg-zinc-800/30 rounded-lg space-y-1 text-sm">
                      {currentPricing.discountPercent > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">Original price</span>
                          <span className="line-through text-zinc-500">
                            ${Math.round(currentPricing.price / (1 - currentPricing.discountPercent / 100))}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Total</span>
                        <span className="font-bold text-[#0ea5e9]">{formatPrice(currentPricing.price)}</span>
                      </div>
                      <div className="text-xs text-zinc-500 text-right">
                        ~{formatPrice(currentPricing.pricePerMonth)}/month
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Currency Selector */}
              {status === "selecting" && (
                <div className="space-y-3">
                  <label className="text-xs font-mono text-zinc-500">SELECT CRYPTOCURRENCY</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {cryptoOptions.map((crypto) => (
                      <motion.button
                        key={crypto.code}
                        onClick={() => setSelectedCurrency(crypto.code)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                          selectedCurrency === crypto.code
                            ? "bg-blue-500/20 border-blue-500 text-blue-400"
                            : "bg-zinc-800/50 border-zinc-700 hover:border-blue-500/50"
                        }`}
                      >
                        <span className="text-lg">{crypto.icon}</span>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{crypto.name}</p>
                          {crypto.network && (
                            <p className="text-[10px] text-zinc-400">{crypto.network}</p>
                          )}
                        </div>
                        {crypto.discount && <Zap className="w-3 h-3 text-green-400 flex-shrink-0" />}
                      </motion.button>
                    ))}
                  </div>

                  <Button 
                    onClick={createPayment} 
                    className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white h-12 shadow-lg shadow-[#0ea5e9]/25 transition-all"
                  >
                    {isExtension ? "PROCEED TO PAYMENT" : "PROCEED TO PAYMENT"}
                  </Button>
                </div>
              )}

              {status === "creating" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="w-8 h-8 text-[#0ea5e9] animate-spin" />
                  <p className="text-sm text-zinc-400 font-mono">GENERATING ADDRESS...</p>
                </div>
              )}

              {status === "waiting" && payment && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg animate-pulse">
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
                      className="rounded-lg border border-zinc-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-500">SEND {selectedCrypto?.name.toUpperCase()} TO:</label>
                    <div className="flex gap-2">
                      <textarea 
                        value={payment.address} 
                        readOnly 
                        rows={3}
                        className="flex-1 bg-zinc-800/50 border border-zinc-700 text-xs font-mono p-3 rounded-lg resize-none break-all text-white"
                      />
                      <Button onClick={copyAddress} size="sm" className="h-auto w-12 p-0 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700">
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-800">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Amount:</span>
                      <span className="font-mono text-white">{payment.amount} {selectedCrypto?.code.toUpperCase()}</span>
                    </div>
                    {payment.discount && (
                      <div className="flex justify-between text-xs">
                        <span className="text-green-400">Discount:</span>
                        <span className="text-green-400">{payment.discount}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 text-center">
                    {selectedCurrency === "usdh" 
                      ? "Send USDH to the address above. Payment will be confirmed manually."
                      : "Funds will be automatically transferred after confirmation."}
                  </p>

                  {/* Back Button */}
                  <button
                    onClick={() => {
                      setStatus("selecting");
                      setPayment(null);
                      setError(null);
                    }}
                    className="w-full py-3 text-sm text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Change Currency
                  </button>
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
