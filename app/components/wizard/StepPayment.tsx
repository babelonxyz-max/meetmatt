"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Check, CreditCard, Bitcoin } from "lucide-react";

interface StepPaymentProps {
  agentName: string;
  onPayWithCard: () => void;
  onPayWithCrypto: () => void;
}

export function StepPayment({ agentName, onPayWithCard, onPayWithCrypto }: StepPaymentProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Ready to deploy {agentName}?</h2>
        <p className="text-gray-400">Choose your payment method</p>
      </div>

      {/* Pricing Card */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
        <div className="text-center">
          <span className="text-4xl font-bold">$99</span>
          <span className="text-gray-400">/month</span>
          <p className="text-sm text-gray-400 mt-2">7-day free trial • Cancel anytime</p>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {[
            "Unlimited messages",
            "Telegram integration",
            "Email & calendar sync",
            "24/7 availability",
            "Custom personality",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Payment Options */}
      <div className="space-y-3">
        <button
          onClick={() => {
            setSelected("card");
            onPayWithCard();
          }}
          className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
            selected === "card"
              ? "bg-blue-600/20 border-blue-500"
              : "bg-gray-900 border-gray-800 hover:border-gray-700"
          }`}
        >
          <div className="p-2 bg-blue-600 rounded-lg">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold">Credit Card</p>
            <p className="text-sm text-gray-400">Visa, Mastercard, Amex</p>
          </div>
        </button>

        <button
          onClick={() => {
            setSelected("crypto");
            onPayWithCrypto();
          }}
          className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
            selected === "crypto"
              ? "bg-purple-600/20 border-purple-500"
              : "bg-gray-900 border-gray-800 hover:border-gray-700"
          }`}
        >
          <div className="p-2 bg-purple-600 rounded-lg">
            <Bitcoin className="w-5 h-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold">Cryptocurrency</p>
            <p className="text-sm text-gray-400">BTC, ETH, USDT, USDC</p>
          </div>
        </button>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Secure payment • Instant deployment
      </p>
    </motion.div>
  );
}
