// HyperEVM / USDH Payment Integration with Secure Wallet Pool
// Uses pre-generated encrypted wallets from database

import { ethers } from "ethers";
import { 
  assignWalletFromPool, 
  executePMTransfer,
  executeDirectTransfer,
  markWalletAsUsed,
  getWalletPoolStats 
} from "./walletPool";

// HyperEVM Network Configuration
const HYPEREVM_CONFIG = {
  chainId: 998, // HyperEVM mainnet
  rpcUrl: process.env.HYPEREVM_RPC_URL || "https://rpc.hyperliquid.xyz/evm",
  name: "HyperEVM",
};

// USDH Token Contract
const USDH_CONTRACT = process.env.USDH_CONTRACT_ADDRESS || "0x54e00a5988577cb0b0c9ab0cb6ef7f4b";

// Master wallet (receives all payments)
const MASTER_WALLET = process.env.HYPEREVM_MASTER_WALLET || "";

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 amount)",
];

// Payment tracking
const paymentStatuses = new Map<string, {
  status: "pending" | "received" | "confirmed" | "transferred" | "failed";
  walletId: string;
  walletAddress: string;
  amount: string;
  txHash?: string;
}>();

interface PaymentSession {
  sessionId: string;
  walletId: string;
  walletAddress: string;
  amount: number;
  status: string;
}

/**
 * Initialize new USDH payment session
 * Assigns wallet from secure pool
 */
export async function initUSDHPayment(
  sessionId: string, 
  userId?: string
): Promise<PaymentSession | null> {
  const DISCOUNTED_AMOUNT = 135; // 10% discount
  
  // Check pool stats first
  const stats = await getWalletPoolStats();
  console.log(`[HyperEVM] Wallet pool: ${stats.available} available, ${stats.assigned} assigned, ${stats.used} used`);
  
  if (stats.available === 0) {
    console.error("[HyperEVM] No wallets available in pool!");
    return null;
  }
  
  // Assign wallet from pool
  const wallet = await assignWalletFromPool(sessionId);
  if (!wallet) {
    console.error("[HyperEVM] Failed to assign wallet from pool");
    return null;
  }
  
  // Track payment status
  paymentStatuses.set(sessionId, {
    status: "pending",
    walletId: wallet.id,
    walletAddress: wallet.address,
    amount: DISCOUNTED_AMOUNT.toString(),
  });

  // Store payment in database with user link
  const { prisma } = await import("@/lib/prisma");
  await prisma.payment.create({
    data: {
      sessionId,
      userId: userId || null,
      tier: "pro", // USDH payments are Pro tier with discount
      currency: "USDH",
      amount: DISCOUNTED_AMOUNT,
      address: wallet.address,
      status: "pending",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });
  
  console.log(`[HyperEVM] Payment initialized for ${sessionId}${userId ? ` (user: ${userId})` : ''} using wallet ${wallet.address}`);
  
  return {
    sessionId,
    walletId: wallet.id,
    walletAddress: wallet.address,
    amount: DISCOUNTED_AMOUNT,
    status: "pending",
  };
}

/**
 * Get provider for HyperEVM
 */
export function getHyperEVMProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(HYPEREVM_CONFIG.rpcUrl, {
    chainId: HYPEREVM_CONFIG.chainId,
    name: HYPEREVM_CONFIG.name,
  });
}

// Alias for backward compatibility
const getProvider = getHyperEVMProvider;

/**
 * Check USDH balance of an address
 */
export async function checkUSDHBalance(address: string): Promise<bigint> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(USDH_CONTRACT, ERC20_ABI, provider);
    
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    
    console.log(`[HyperEVM] Balance of ${address}: ${ethers.formatUnits(balance, decimals)} USDH`);
    
    return BigInt(balance.toString());
  } catch (error) {
    console.error("[HyperEVM] Error checking balance:", error);
    return BigInt(0);
  }
}

/**
 * Check if payment is received
 */
export async function checkPaymentReceived(sessionId: string): Promise<boolean> {
  const payment = paymentStatuses.get(sessionId);
  if (!payment) {
    console.error(`[HyperEVM] No payment found for session: ${sessionId}`);
    return false;
  }
  
  try {
    const balance = await checkUSDHBalance(payment.walletAddress);
    const requiredAmount = ethers.parseUnits(payment.amount, 6); // USDH has 6 decimals
    
    if (balance >= requiredAmount) {
      console.log(`[HyperEVM] Payment received for session: ${sessionId}`);
      payment.status = "received";
      paymentStatuses.set(sessionId, payment);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[HyperEVM] Error checking payment:", error);
    return false;
  }
}

/**
 * Transfer funds from assigned wallet to master wallet
 * Uses PM wallet relayer pattern (PM pays gas, executes transferFrom)
 */
export async function transferToMasterWallet(sessionId: string): Promise<string | null> {
  const payment = paymentStatuses.get(sessionId);
  
  if (!payment) {
    console.error(`[HyperEVM] No payment found for session: ${sessionId}`);
    return null;
  }
  
  if (!MASTER_WALLET) {
    console.error("[HyperEVM] Master wallet not configured");
    return null;
  }
  
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(USDH_CONTRACT, ERC20_ABI, provider);
    
    // Check balance
    const balance = await contract.balanceOf(payment.walletAddress);
    
    if (balance === BigInt(0)) {
      console.error("[HyperEVM] No funds to transfer");
      return null;
    }
    
    console.log(`[HyperEVM] Transferring ${ethers.formatUnits(balance, 6)} USDH from ${payment.walletAddress}...`);
    
    // Try PM wallet transfer first (relayer pattern - PM pays gas)
    let result = await executePMTransfer(payment.walletId, balance);
    
    // Fallback to direct transfer if PM fails (burner pays gas)
    if (!result.success) {
      console.log(`[HyperEVM] PM transfer failed (${result.error}), trying direct transfer...`);
      result = await executeDirectTransfer(payment.walletId, balance);
    }
    
    if (!result.success) {
      throw new Error(result.error || "Transfer failed");
    }
    
    // Update status
    payment.status = "transferred";
    payment.txHash = result.txHash;
    paymentStatuses.set(sessionId, payment);
    
    // Update payment in database
    const { prisma } = await import("@/lib/prisma");
    await prisma.payment.updateMany({
      where: { sessionId },
      data: {
        status: "confirmed",
        txHash: result.txHash,
        confirmedAt: new Date(),
      },
    });
    
    console.log(`[HyperEVM] Transfer confirmed: ${result.txHash}`);
    return result.txHash || null;
  } catch (error) {
    console.error("[HyperEVM] Transfer failed:", error);
    
    payment.status = "failed";
    paymentStatuses.set(sessionId, payment);
    
    return null;
  }
}

/**
 * Poll for payment and auto-transfer
 */
export async function pollForPayment(
  sessionId: string,
  onStatusUpdate?: (status: string) => void,
  maxAttempts: number = 360,
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
        onStatusUpdate?.("transferred");
        return true;
      }
    }
    
    const payment = paymentStatuses.get(sessionId);
    if (payment) {
      onStatusUpdate?.(payment.status);
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return false;
}

/**
 * Get payment status
 */
export function getPaymentStatus(sessionId: string) {
  return paymentStatuses.get(sessionId) || null;
}

/**
 * Get wallet address for session
 */
export function getWalletAddress(sessionId: string): string | null {
  return paymentStatuses.get(sessionId)?.walletAddress || null;
}
