// HyperEVM / USDH Payment Integration
// Hyperliquid's EVM chain with USDH stablecoin

import { ethers } from "ethers";

// HyperEVM Network Configuration
const HYPEREVM_CONFIG = {
  chainId: 998, // HyperEVM mainnet
  rpcUrl: process.env.HYPEREVM_RPC_URL || "https://rpc.hyperliquid.xyz/evm",
  name: "HyperEVM",
  nativeCurrency: {
    name: "HYPE",
    symbol: "HYPE",
    decimals: 18,
  },
};

// USDH Token Contract (Hypers native stablecoin on HyperEVM)
const USDH_CONTRACT = process.env.USDH_CONTRACT_ADDRESS || "0x54e00a5988577cb0b0c9ab0cb6ef7f4b";

// ERC20 ABI (minimal for transfer and balance)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 amount)",
];

// Payment amount (10% discount: $150 → $135)
const PAYMENT_AMOUNT_USD = 135;

interface BurnerWallet {
  address: string;
  privateKey: string;
  createdAt: Date;
  sessionId: string;
}

interface PaymentStatus {
  status: "pending" | "received" | "confirmed" | "transferred" | "failed";
  burnerAddress: string;
  amount: string;
  txHash?: string;
  blockNumber?: number;
}

// Store burner wallets (in production, use database with encryption)
const burnerWallets = new Map<string, BurnerWallet>();
const paymentStatuses = new Map<string, PaymentStatus>();

/**
 * Generate new burner wallet for payment
 */
export function generateBurnerWallet(sessionId: string): BurnerWallet {
  const wallet = ethers.Wallet.createRandom();
  
  const burnerWallet: BurnerWallet = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    createdAt: new Date(),
    sessionId,
  };
  
  // Store with session ID
  burnerWallets.set(sessionId, burnerWallet);
  paymentStatuses.set(sessionId, {
    status: "pending",
    burnerAddress: wallet.address,
    amount: PAYMENT_AMOUNT_USD.toString(),
  });
  
  console.log(`[HyperEVM] Generated burner wallet: ${wallet.address} for session: ${sessionId}`);
  
  return burnerWallet;
}

/**
 * Get provider for HyperEVM
 */
function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(HYPEREVM_CONFIG.rpcUrl, {
    chainId: HYPEREVM_CONFIG.chainId,
    name: HYPEREVM_CONFIG.name,
  });
}

/**
 * Check USDH balance of an address
 */
export async function checkUSDHBalance(address: string): Promise<ethers.BigNumberish> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(USDH_CONTRACT, ERC20_ABI, provider);
    
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    
    console.log(`[HyperEVM] Balance of ${address}: ${ethers.formatUnits(balance, decimals)} USDH`);
    
    return balance;
  } catch (error) {
    console.error("[HyperEVM] Error checking balance:", error);
    return 0;
  }
}

/**
 * Check if payment is received
 */
export async function checkPaymentReceived(sessionId: string): Promise<boolean> {
  const wallet = burnerWallets.get(sessionId);
  if (!wallet) {
    console.error(`[HyperEVM] No wallet found for session: ${sessionId}`);
    return false;
  }
  
  try {
    const balance = await checkUSDHBalance(wallet.address);
    const requiredAmount = ethers.parseUnits(PAYMENT_AMOUNT_USD.toString(), 6);
    
    const status = paymentStatuses.get(sessionId);
    
    if (ethers.getBigInt(balance) >= requiredAmount) {
      console.log(`[HyperEVM] Payment received for session: ${sessionId}`);
      if (status) {
        status.status = "received";
        paymentStatuses.set(sessionId, status);
      }
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[HyperEVM] Error checking payment:", error);
    return false;
  }
}

/**
 * Transfer funds from burner to master wallet
 */
export async function transferToMasterWallet(sessionId: string): Promise<string | null> {
  const wallet = burnerWallets.get(sessionId);
  const masterWallet = process.env.HYPEREVM_MASTER_WALLET;
  
  if (!wallet) {
    console.error(`[HyperEVM] No burner wallet for session: ${sessionId}`);
    return null;
  }
  
  if (!masterWallet) {
    console.error("[HyperEVM] Master wallet not configured");
    return null;
  }
  
  try {
    const provider = getProvider();
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const contract = new ethers.Contract(USDH_CONTRACT, ERC20_ABI, signer);
    
    // Check balance
    const balance = await contract.balanceOf(wallet.address);
    
    if (balance === BigInt(0)) {
      console.error("[HyperEVM] No funds to transfer");
      return null;
    }
    
    // Transfer all USDH to master wallet
    const tx = await contract.transfer(masterWallet, balance);
    console.log(`[HyperEVM] Transfer tx sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`[HyperEVM] Transfer confirmed: ${receipt?.hash}`);
    
    // Update status
    const status = paymentStatuses.get(sessionId);
    if (status && receipt) {
      status.status = "transferred";
      status.txHash = receipt.hash;
      status.blockNumber = receipt.blockNumber;
      paymentStatuses.set(sessionId, status);
    }
    
    // Clean up - remove private key from memory
    burnerWallets.delete(sessionId);
    
    return receipt?.hash || null;
  } catch (error) {
    console.error("[HyperEVM] Transfer failed:", error);
    
    const status = paymentStatuses.get(sessionId);
    if (status) {
      status.status = "failed";
      paymentStatuses.set(sessionId, status);
    }
    
    return null;
  }
}

/**
 * Poll for payment and auto-transfer
 */
export async function pollForPayment(
  sessionId: string,
  onStatusUpdate?: (status: PaymentStatus) => void,
  maxAttempts: number = 360, // 30 minutes (5s intervals)
  intervalMs: number = 5000
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const received = await checkPaymentReceived(sessionId);
    
    if (received) {
      // Wait 2 blocks for confirmation
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Transfer to master wallet
      const txHash = await transferToMasterWallet(sessionId);
      
      if (txHash) {
        const status = paymentStatuses.get(sessionId);
        if (status) {
          onStatusUpdate?.(status);
        }
        return true;
      }
    }
    
    const status = paymentStatuses.get(sessionId);
    if (status) {
      onStatusUpdate?.(status);
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return false;
}

/**
 * Get payment status
 */
export function getPaymentStatus(sessionId: string): PaymentStatus | null {
  return paymentStatuses.get(sessionId) || null;
}

/**
 * Get burner address for session
 */
export function getBurnerAddress(sessionId: string): string | null {
  return burnerWallets.get(sessionId)?.address || null;
}

// Export types
export type { BurnerWallet, PaymentStatus };
