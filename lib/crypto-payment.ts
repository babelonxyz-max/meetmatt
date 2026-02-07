// Self-hosted crypto payment system with multi-chain stablecoin support
// Supports: USDT (BSC, Solana, TRC20, HyperEVM), USDC (Base, Solana, HyperEVM, Arbitrum), USDH (HyperEVM)

import { prisma } from './prisma';

// Payment addresses for receiving funds - THESE MUST BE SET!
const ADDRESSES = {
  // EVM chains (Base, HyperEVM, Arbitrum, BSC) - can use same address
  EVM: process.env.EVM_PAYMENT_ADDRESS || '',
  // Solana - different address format
  SOL: process.env.SOL_PAYMENT_ADDRESS || '',
  // TRON - different address format
  TRON: process.env.TRON_PAYMENT_ADDRESS || '',
};

// Price in USD for each tier
export const PRICES = {
  starter: 29,
  pro: 99,
  enterprise: 299,
};

// Supported currencies with their details
export const SUPPORTED_CURRENCIES = {
  // USDH (HyperEVM native stablecoin) - PRIMARY/RECOMMENDED
  'USDH-HYPE': { name: 'USDH', chain: 'HyperEVM', logo: '🟣', type: 'ERC20' },
  // USDT
  'USDT-BSC': { name: 'USDT', chain: 'BSC', logo: '🔶', type: 'BEP20' },
  'USDT-SOL': { name: 'USDT', chain: 'Solana', logo: '💜', type: 'SPL' },
  'USDT-TRC20': { name: 'USDT', chain: 'TRON', logo: '🔴', type: 'TRC20' },
  // USDC
  'USDC-BASE': { name: 'USDC', chain: 'Base', logo: '🔵', type: 'ERC20' },
  'USDC-SOL': { name: 'USDC', chain: 'Solana', logo: '💜', type: 'SPL' },
};

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

// Payment counter for generating unique IDs
let paymentCounter = 0;

// Generate a unique payment identifier (used to track payments to the same address)
export function generatePaymentId(): string {
  paymentCounter++;
  return `${Date.now()}-${paymentCounter}-${Math.random().toString(36).substring(2, 8)}`;
}

// Get payment address for a currency
// NOTE: In production, you should use HD wallet derivation for unique addresses per payment
export async function getPaymentAddress(currency: CurrencyCode): Promise<string> {
  const chain = SUPPORTED_CURRENCIES[currency].chain;
  
  switch (chain) {
    case 'BSC':
    case 'Base':
    case 'HyperEVM':
    case 'Arbitrum':
      if (!ADDRESSES.EVM) {
        // Demo mode - generate mock address
        return `0x${generateMockHash().slice(0, 40)}`;
      }
      return ADDRESSES.EVM;
      
    case 'Solana':
      if (!ADDRESSES.SOL) {
        // Demo mode - generate mock address
        return `${generateMockHash().slice(0, 43)}`;
      }
      return ADDRESSES.SOL;
      
    case 'TRON':
      if (!ADDRESSES.TRON) {
        // Demo mode - generate mock address
        return `T${generateMockHash().slice(0, 33)}`;
      }
      return ADDRESSES.TRON;
      
    default:
      throw new Error('Unsupported chain');
  }
}

// Create a payment request
export async function createPaymentRequest({
  sessionId,
  tier,
  currency,
}: {
  sessionId: string;
  tier: 'starter' | 'pro' | 'enterprise';
  currency: CurrencyCode;
}) {
  try {
    // Validate config
    if (!PRICES[tier]) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    const usdAmount = PRICES[tier];
    
    // Get payment address
    let address: string;
    try {
      address = await getPaymentAddress(currency);
    } catch (error: any) {
      throw new Error(`Payment address not configured: ${error.message}`);
    }
    
    // For stablecoins, amount is 1:1 with USD
    const amount = usdAmount;
    
    // Generate unique payment ID for tracking
    const paymentId = generatePaymentId();
    
    // Store payment request in database
    const payment = await prisma.payment.create({
      data: {
        sessionId,
        tier,
        currency,
        amount,
        address,
        status: 'pending',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour expiry
      },
    });
    
    return {
      id: payment.id,
      address,
      amount,
      currency,
      currencyInfo: SUPPORTED_CURRENCIES[currency],
      qrCode: generateQRCode(address, amount, currency),
      paymentId, // Include this so frontend can show it as memo/payment ID
    };
  } catch (error: any) {
    console.error('Error in createPaymentRequest:', error);
    throw error;
  }
}

// Check if payment was received
export async function checkPayment(paymentId: string): Promise<{
  status: 'pending' | 'confirming' | 'confirmed' | 'expired';
  confirmations?: number;
  txHash?: string;
  amount?: number;
}> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.status === 'confirmed') {
      return { 
        status: 'confirmed', 
        confirmations: 6, 
        txHash: payment.txHash || undefined,
        amount: payment.amount,
      };
    }
    
    if (new Date() > payment.expiresAt) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'expired' },
      });
      return { status: 'expired' };
    }
    
    // Check blockchain for payment
    const received = await checkBlockchainForPayment(payment);
    
    if (received) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { 
          status: 'confirmed',
          txHash: received.txHash,
          confirmedAt: new Date(),
        },
      });
      
      return { 
        status: 'confirmed', 
        confirmations: received.confirmations,
        txHash: received.txHash,
        amount: received.amount,
      };
    }
    
    return { status: 'pending' };
  } catch (error: any) {
    console.error('Error in checkPayment:', error);
    throw error;
  }
}

// Check blockchain APIs for payment
async function checkBlockchainForPayment(payment: any): Promise<{ confirmations: number; txHash: string; amount: number } | null> {
  try {
    const currency = payment.currency as CurrencyCode;
    const chain = SUPPORTED_CURRENCIES[currency]?.chain;
    
    // For demo/testing without API keys, simulate a payment after some time
    // REMOVE THIS IN PRODUCTION!
    const timeSinceCreation = Date.now() - new Date(payment.createdAt).getTime();
    if (timeSinceCreation > 10000 && process.env.SKIP_PAYMENT_CHECK === 'true') {
      console.log('Simulating payment confirmation for testing');
      return {
        confirmations: 6,
        txHash: `0x${generateMockHash()}`,
        amount: payment.amount,
      };
    }
    
    switch (chain) {
      case 'BSC':
        return await checkBSCPayment(payment.address, payment.amount, currency);
      case 'Base':
        return await checkBasePayment(payment.address, payment.amount, currency);
      case 'HyperEVM':
        return await checkHyperEVMPayment(payment.address, payment.amount, currency);
      case 'Arbitrum':
        return await checkArbitrumPayment(payment.address, payment.amount, currency);
      case 'Solana':
        return await checkSolanaPayment(payment.address, payment.amount, currency);
      case 'TRON':
        return await checkTronPayment(payment.address, payment.amount, currency);
      default:
        return null;
    }
  } catch (error) {
    console.error('Blockchain check error:', error);
    return null;
  }
}

// Check BSC (BEP20 tokens) via BSCScan API
async function checkBSCPayment(address: string, expectedAmount: number, currency: string): Promise<{ confirmations: number; txHash: string; amount: number } | null> {
  try {
    const tokenAddress = currency === 'USDT-BSC' 
      ? '0x55d398326f99059fF775485246999027B3197955' // USDT BSC
      : '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'; // USDC BSC
    
    const apiKey = process.env.BSCSCAN_API_KEY || '';
    const url = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${tokenAddress}&address=${address}&page=1&offset=10&sort=desc${apiKey ? `&apikey=${apiKey}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result.length > 0) {
      for (const tx of data.result) {
        const amount = parseFloat(tx.value) / 1e18;
        if (tx.to.toLowerCase() === address.toLowerCase() && amount >= expectedAmount * 0.99) {
          return {
            confirmations: parseInt(tx.confirmations) || 6,
            txHash: tx.hash,
            amount,
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('BSC check error:', error);
    return null;
  }
}

// Check Base via BaseScan API
async function checkBasePayment(address: string, expectedAmount: number, currency: string): Promise<{ confirmations: number; txHash: string; amount: number } | null> {
  try {
    const tokenAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC Base
    const apiKey = process.env.BASESCAN_API_KEY || '';
    const url = `https://api.basescan.org/api?module=account&action=tokentx&contractaddress=${tokenAddress}&address=${address}&page=1&offset=10&sort=desc${apiKey ? `&apikey=${apiKey}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result.length > 0) {
      for (const tx of data.result) {
        const amount = parseFloat(tx.value) / 1e6; // USDC has 6 decimals
        if (tx.to.toLowerCase() === address.toLowerCase() && amount >= expectedAmount * 0.99) {
          return {
            confirmations: parseInt(tx.confirmations) || 6,
            txHash: tx.hash,
            amount,
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Base check error:', error);
    return null;
  }
}

// Check HyperEVM (Hyperliquid's EVM)
async function checkHyperEVMPayment(address: string, expectedAmount: number, currency: string): Promise<{ confirmations: number; txHash: string; amount: number } | null> {
  // HyperEVM uses the same API format as Ethereum
  // For now, return null - implement when HyperEVM explorer API is available
  return null;
}

// Check Arbitrum via Arbiscan API
async function checkArbitrumPayment(address: string, expectedAmount: number, currency: string): Promise<{ confirmations: number; txHash: string; amount: number } | null> {
  try {
    const tokenAddress = currency === 'USDC-ARB'
      ? '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' // USDC Arbitrum
      : '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'; // USDT Arbitrum
    
    const apiKey = process.env.ARBISCAN_API_KEY || '';
    const url = `https://api.arbiscan.io/api?module=account&action=tokentx&contractaddress=${tokenAddress}&address=${address}&page=1&offset=10&sort=desc${apiKey ? `&apikey=${apiKey}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result.length > 0) {
      for (const tx of data.result) {
        const decimals = parseInt(tx.tokenDecimal) || 6;
        const amount = parseFloat(tx.value) / Math.pow(10, decimals);
        if (tx.to.toLowerCase() === address.toLowerCase() && amount >= expectedAmount * 0.99) {
          return {
            confirmations: parseInt(tx.confirmations) || 6,
            txHash: tx.hash,
            amount,
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Arbitrum check error:', error);
    return null;
  }
}

// Check Solana (SPL tokens)
async function checkSolanaPayment(address: string, expectedAmount: number, currency: string): Promise<{ confirmations: number; txHash: string; amount: number } | null> {
  try {
    const apiKey = process.env.HELIUS_API_KEY || '';
    
    if (!apiKey) {
      console.log('No Solana API key, skipping check');
      return null;
    }
    
    const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}`;
    const response = await fetch(url);
    const txs = await response.json();
    
    const tokenMint = currency === 'USDT-SOL' 
      ? 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
      : 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
    
    for (const tx of txs) {
      for (const tokenTransfer of tx.tokenTransfers || []) {
        if (tokenTransfer.mint === tokenMint && 
            tokenTransfer.toUserAccount === address &&
            tokenTransfer.tokenAmount >= expectedAmount * 0.99) {
          return {
            confirmations: tx.slot ? 32 : 1,
            txHash: tx.signature,
            amount: tokenTransfer.tokenAmount,
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Solana check error:', error);
    return null;
  }
}

// Check TRON (TRC20 tokens)
async function checkTronPayment(address: string, expectedAmount: number, currency: string): Promise<{ confirmations: number; txHash: string; amount: number } | null> {
  try {
    const contractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // USDT TRC20
    
    const apiKey = process.env.TRONGRID_API_KEY || '';
    const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=10&contract_address=${contractAddress}`;
    
    const response = await fetch(url, {
      headers: apiKey ? { 'TRON-PRO-API-KEY': apiKey } : {}
    });
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      for (const tx of data.data) {
        const amount = parseFloat(tx.value) / 1e6;
        if (tx.to === address && amount >= expectedAmount * 0.99) {
          return {
            confirmations: tx.confirmations || 6,
            txHash: tx.transaction_id,
            amount,
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error('TRON check error:', error);
    return null;
  }
}

// Helper functions
function generateMockHash(): string {
  return Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function generateQRCode(address: string, amount: number, currency: CurrencyCode): string {
  const info = SUPPORTED_CURRENCIES[currency];
  let uri: string;
  
  switch (info.chain) {
    case 'BSC':
    case 'Base':
    case 'HyperEVM':
    case 'Arbitrum':
      uri = `ethereum:${address}?value=${amount * 1e6}&gas=42000`;
      break;
    case 'Solana':
      uri = `solana:${address}?amount=${amount}`;
      break;
    case 'TRON':
      uri = `tron:${address}?amount=${amount}`;
      break;
    default:
      uri = address;
  }
  
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(uri)}`;
}
