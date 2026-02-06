import { defineChain } from "viem";

// HyperEVM Chain Definition
export const hyperLiquid = defineChain({
  id: 998,
  name: "HyperEVM",
  nativeCurrency: {
    name: "Hyper",
    symbol: "HYPER",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.hyperliquid.xyz/evm"],
    },
    public: {
      http: ["https://rpc.hyperliquid.xyz/evm"],
    },
  },
  blockExplorers: {
    default: {
      name: "HyperEVM Explorer",
      url: "https://purrsec.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 1,
    },
  },
});
