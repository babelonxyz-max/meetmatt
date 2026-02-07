// Secure Wallet Pool Management with Relayer Pattern
// PM Wallet handles transfers, burner wallets only hold approvals

import { ethers } from "ethers";
import { prisma } from "./prisma";
import { getHyperEVMProvider } from "./hyperevm";

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || "";
const MASTER_WALLET = process.env.HYPEREVM_MASTER_WALLET || "";
const PM_WALLET_KEY = process.env.PM_WALLET_KEY || "";

// Minimal gas for approval: 0.001 HYPER (~$0.02, covers 1 approval + some buffer)
const APPROVAL_GAS_FUND = ethers.parseEther("0.001");

interface WalletPoolEntry {
  id: string;
  address: string;
  encryptedPrivateKey: string;
  status: "available" | "assigned" | "used";
  pmApproved: boolean; // Whether PM wallet is approved to spend
  assignedToSession?: string;
  assignedAt?: Date;
  createdAt: Date;
}

/**
 * Generate wallets - NO pre-funding needed in relayer pattern
 * Approval happens at assignment time with minimal gas
 */
export async function generateWalletPool(count: number = 100): Promise<string[]> {
  const wallets: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = encryptPrivateKey(wallet.privateKey);
    
    await prisma.walletPool.create({
      data: {
        address: wallet.address,
        encryptedPrivateKey: encryptedKey,
        status: "available",
        pmApproved: false,
      },
    });
    
    wallets.push(wallet.address);
  }
  
  console.log(`[WalletPool] Generated ${count} wallets (no pre-funding needed)`);
  return wallets;
}

/**
 * Assign wallet and set up approval for PM wallet
 * This is where minimal gas is spent (0.001 HYPER)
 */
export async function assignWalletFromPool(
  sessionId: string
): Promise<{ address: string; id: string; ready: boolean } | null> {
  // Find available wallet
  const wallet = await prisma.walletPool.findFirst({
    where: { status: "available" },
    orderBy: { createdAt: "asc" },
  });
  
  if (!wallet) {
    console.error("[WalletPool] No available wallets!");
    return null;
  }
  
  // Set up approval for PM wallet (one-time gas cost)
  const approvalSuccess = await setupPMApproval(wallet.id, wallet.address);
  
  // Mark as assigned
  await prisma.walletPool.update({
    where: { id: wallet.id },
    data: {
      status: "assigned",
      assignedToSession: sessionId,
      assignedAt: new Date(),
      pmApproved: approvalSuccess,
    },
  });
  
  console.log(`[WalletPool] Assigned ${wallet.address} to ${sessionId} (approval: ${approvalSuccess})`);
  
  return {
    address: wallet.address,
    id: wallet.id,
    ready: approvalSuccess,
  };
}

/**
 * Set up approval: PM wallet sends gas, burner approves PM to spend USDH
 * This is the ONLY time burner needs gas (0.001 HYPER)
 */
async function setupPMApproval(walletId: string, walletAddress: string): Promise<boolean> {
  try {
    if (!PM_WALLET_KEY) {
      console.error("[WalletPool] PM_WALLET_KEY not configured - cannot fund burner wallets");
      return false;
    }

    const provider = getHyperEVMProvider();
    const pmWallet = new ethers.Wallet(PM_WALLET_KEY, provider);
    
    // Step 1: PM sends minimal gas to burner
    const fundTx = await pmWallet.sendTransaction({
      to: walletAddress,
      value: APPROVAL_GAS_FUND,
    });
    await fundTx.wait();
    console.log(`[WalletPool] Funded ${walletAddress} with ${ethers.formatEther(APPROVAL_GAS_FUND)} HYPER`);
    
    // Step 2: Burner wallet approves PM to spend USDH (infinite approval)
    const privateKey = await getWalletPrivateKey(walletId);
    if (!privateKey) return false;
    
    const burnerWallet = new ethers.Wallet(privateKey, provider);
    const USDH_CONTRACT = process.env.USDH_CONTRACT_ADDRESS!;
    
    const erc20Abi = [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
    ];
    
    const contract = new ethers.Contract(USDH_CONTRACT, erc20Abi, burnerWallet);
    const approveTx = await contract.approve(pmWallet.address, ethers.MaxUint256);
    await approveTx.wait();
    
    console.log(`[WalletPool] PM wallet approved for ${walletAddress}`);
    return true;
  } catch (err) {
    console.error(`[WalletPool] Approval setup failed for ${walletAddress}:`, err);
    return false;
  }
}

/**
 * PM Wallet executes transferFrom (uses PM's gas, not burner's)
 * This is the key relayer pattern - PM pays gas, transfers from burner to master
 */
export async function executePMTransfer(
  walletId: string,
  amount: bigint
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!PM_WALLET_KEY) {
      return { success: false, error: "PM wallet not configured" };
    }

    const wallet = await prisma.walletPool.findUnique({
      where: { id: walletId },
    });
    
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    const provider = getHyperEVMProvider();
    const pmWallet = new ethers.Wallet(PM_WALLET_KEY, provider);
    const USDH_CONTRACT = process.env.USDH_CONTRACT_ADDRESS!;
    
    const erc20Abi = [
      "function transferFrom(address from, address to, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)",
    ];
    
    // Check if PM is approved
    const allowanceAbi = ["function allowance(address owner, address spender) view returns (uint256)"];
    const allowanceContract = new ethers.Contract(USDH_CONTRACT, allowanceAbi, provider);
    const allowance = await allowanceContract.allowance(wallet.address, pmWallet.address);
    
    if (allowance < amount) {
      return { success: false, error: "PM not approved or insufficient allowance" };
    }
    
    // PM executes transferFrom (burner → master)
    const contract = new ethers.Contract(USDH_CONTRACT, erc20Abi, pmWallet);
    const tx = await contract.transferFrom(wallet.address, MASTER_WALLET, amount);
    const receipt = await tx.wait();
    
    // Mark as used
    await markWalletAsUsed(walletId);
    
    console.log(`[PM Wallet] Transferred ${amount} USDH from ${wallet.address} to master`);
    return { success: true, txHash: receipt.hash };
  } catch (err: any) {
    console.error("[PM Wallet] Transfer failed:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Alternative: Direct transfer using burner's own gas (fallback)
 * Used when PM approval failed or for recovery
 */
export async function executeDirectTransfer(
  walletId: string,
  amount: bigint
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const privateKey = await getWalletPrivateKey(walletId);
    if (!privateKey) {
      return { success: false, error: "Wallet not found" };
    }

    const provider = getHyperEVMProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const USDH_CONTRACT = process.env.USDH_CONTRACT_ADDRESS!;
    
    // Check burner has gas
    const gasBalance = await provider.getBalance(wallet.address);
    if (gasBalance < ethers.parseEther("0.0001")) {
      return { success: false, error: "Burner has no gas, use PM transfer or fund gas" };
    }
    
    const erc20Abi = [
      "function transfer(address to, uint256 amount) returns (bool)",
    ];
    
    const contract = new ethers.Contract(USDH_CONTRACT, erc20Abi, wallet);
    const tx = await contract.transfer(MASTER_WALLET, amount);
    const receipt = await tx.wait();
    
    await markWalletAsUsed(walletId);
    
    return { success: true, txHash: receipt.hash };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ... rest of helper functions (getWalletPrivateKey, markWalletAsUsed, etc.) ...

export async function getWalletPrivateKey(walletId: string): Promise<string | null> {
  const wallet = await prisma.walletPool.findUnique({
    where: { id: walletId },
  });
  
  if (!wallet) return null;
  return decryptPrivateKey(wallet.encryptedPrivateKey);
}

export async function markWalletAsUsed(walletId: string): Promise<void> {
  await prisma.walletPool.update({
    where: { id: walletId },
    data: { status: "used" },
  });
}

export async function getWalletPoolStats(): Promise<{
  total: number;
  available: number;
  assigned: number;
  used: number;
  pmApproved: number;
}> {
  const [total, available, assigned, used, pmApproved] = await Promise.all([
    prisma.walletPool.count(),
    prisma.walletPool.count({ where: { status: "available" } }),
    prisma.walletPool.count({ where: { status: "assigned" } }),
    prisma.walletPool.count({ where: { status: "used" } }),
    prisma.walletPool.count({ where: { pmApproved: true } }),
  ]);
  
  return { total, available, assigned, used, pmApproved };
}

// Encryption functions (same as before)
function encryptPrivateKey(privateKey: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error("WALLET_ENCRYPTION_KEY not configured");
  }
  
  const crypto = require("crypto");
  const key = ENCRYPTION_KEY.slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key), iv);
  
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decryptPrivateKey(encryptedData: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error("WALLET_ENCRYPTION_KEY not configured");
  }
  
  const crypto = require("crypto");
  const key = ENCRYPTION_KEY.slice(0, 32);
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Recovery: Fund gas and transfer directly
 */
export async function recoverStuckFunds(
  walletId: string,
  toAddress?: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const target = toAddress || MASTER_WALLET;
  
  try {
    const wallet = await prisma.walletPool.findUnique({
      where: { id: walletId },
    });
    
    if (!wallet) return { success: false, error: "Wallet not found" };

    const provider = getHyperEVMProvider();
    const USDH_CONTRACT = process.env.USDH_CONTRACT_ADDRESS!;
    
    // Check USDH balance
    const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
    const contract = new ethers.Contract(USDH_CONTRACT, erc20Abi, provider);
    const balance = await contract.balanceOf(wallet.address);
    
    if (balance === BigInt(0)) {
      return { success: false, error: "No USDH balance" };
    }

    // Try PM transfer first
    const pmResult = await executePMTransfer(walletId, balance);
    if (pmResult.success) return pmResult;
    
    // Fallback: Fund gas and do direct transfer
    if (!PM_WALLET_KEY) {
      return { success: false, error: "No PM wallet for recovery" };
    }
    
    const pmWallet = new ethers.Wallet(PM_WALLET_KEY, provider);
    const fundTx = await pmWallet.sendTransaction({
      to: wallet.address,
      value: ethers.parseEther("0.01"),
    });
    await fundTx.wait();
    
    return executeDirectTransfer(walletId, balance);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
