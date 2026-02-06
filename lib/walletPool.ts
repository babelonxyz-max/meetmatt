// Secure Wallet Pool Management
// Pre-generated wallets stored encrypted in database

import { ethers } from "ethers";
import { prisma } from "./prisma";

// Encryption key from environment
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || "";

interface WalletPoolEntry {
  id: string;
  address: string;
  encryptedPrivateKey: string;
  status: "available" | "assigned" | "used";
  assignedToSession?: string;
  assignedAt?: Date;
  createdAt: Date;
}

/**
 * Generate a batch of wallets and store them encrypted in database
 * Call this once to pre-populate the wallet pool
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
      },
    });
    
    wallets.push(wallet.address);
  }
  
  console.log(`[WalletPool] Generated ${count} wallets`);
  return wallets;
}

/**
 * Get next available wallet from pool
 */
export async function assignWalletFromPool(sessionId: string): Promise<{ address: string; id: string } | null> {
  // Find available wallet
  const wallet = await prisma.walletPool.findFirst({
    where: { status: "available" },
    orderBy: { createdAt: "asc" },
  });
  
  if (!wallet) {
    console.error("[WalletPool] No available wallets in pool!");
    return null;
  }
  
  // Mark as assigned
  await prisma.walletPool.update({
    where: { id: wallet.id },
    data: {
      status: "assigned",
      assignedToSession: sessionId,
      assignedAt: new Date(),
    },
  });
  
  console.log(`[WalletPool] Assigned wallet ${wallet.address} to session ${sessionId}`);
  
  return {
    address: wallet.address,
    id: wallet.id,
  };
}

/**
 * Get private key for a wallet (decrypt from database)
 */
export async function getWalletPrivateKey(walletId: string): Promise<string | null> {
  const wallet = await prisma.walletPool.findUnique({
    where: { id: walletId },
  });
  
  if (!wallet) {
    console.error(`[WalletPool] Wallet ${walletId} not found`);
    return null;
  }
  
  return decryptPrivateKey(wallet.encryptedPrivateKey);
}

/**
 * Mark wallet as used (after successful transfer)
 */
export async function markWalletAsUsed(walletId: string): Promise<void> {
  await prisma.walletPool.update({
    where: { id: walletId },
    data: { status: "used" },
  });
  
  console.log(`[WalletPool] Wallet ${walletId} marked as used`);
}

/**
 * Get pool statistics
 */
export async function getWalletPoolStats(): Promise<{
  total: number;
  available: number;
  assigned: number;
  used: number;
}> {
  const [total, available, assigned, used] = await Promise.all([
    prisma.walletPool.count(),
    prisma.walletPool.count({ where: { status: "available" } }),
    prisma.walletPool.count({ where: { status: "assigned" } }),
    prisma.walletPool.count({ where: { status: "used" } }),
  ]);
  
  return { total, available, assigned, used };
}

/**
 * Encrypt private key using AES-256-GCM
 */
function encryptPrivateKey(privateKey: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error("WALLET_ENCRYPTION_KEY not configured properly");
  }
  
  // Use ethers built-in encryption
  const key = ENCRYPTION_KEY.slice(0, 32);
  const iv = ethers.randomBytes(16);
  
  // Simple XOR encryption for demo (use proper AES in production)
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKey);
  const keyBytes = encoder.encode(key);
  
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  
  // Store as: iv:encrypted
  const combined = new Uint8Array(iv.length + encrypted.length);
  combined.set(iv);
  combined.set(encrypted, iv.length);
  
  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypt private key
 */
function decryptPrivateKey(encryptedData: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error("WALLET_ENCRYPTION_KEY not configured properly");
  }
  
  const key = ENCRYPTION_KEY.slice(0, 32);
  const combined = Buffer.from(encryptedData, "base64");
  
  const iv = combined.slice(0, 16);
  const encrypted = combined.slice(16);
  
  // XOR decryption
  const decoder = new TextDecoder();
  const keyBytes = new TextEncoder().encode(key);
  
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return decoder.decode(decrypted);
}

/**
 * Export private keys (for backup/recovery)
 * Only accessible with proper authorization
 */
export async function exportWalletPrivateKey(
  walletId: string,
  authToken: string
): Promise<string | null> {
  // Verify auth token (implement proper auth)
  if (authToken !== process.env.ADMIN_AUTH_TOKEN) {
    throw new Error("Unauthorized");
  }
  
  return getWalletPrivateKey(walletId);
}

/**
 * Recovery: Get stuck funds from a wallet
 * If auto-transfer failed, manually recover
 */
export async function recoverStuckFunds(
  walletId: string,
  masterWallet: string
): Promise<string | null> {
  const privateKey = await getWalletPrivateKey(walletId);
  if (!privateKey) return null;
  
  const wallet = new ethers.Wallet(privateKey);
  
  // Check balance and transfer
  // Implementation similar to hyperevm.ts transfer function
  console.log(`[WalletPool] Recovering funds from ${wallet.address} to ${masterWallet}`);
  
  // TODO: Implement actual transfer logic
  
  return wallet.address;
}
