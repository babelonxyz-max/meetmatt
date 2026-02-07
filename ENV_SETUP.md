# Meet Matt - Environment Variables Setup

Complete guide for setting up all environment variables for production deployment.

## Quick Start Checklist

- [ ] Database (SQLite for dev, PostgreSQL for prod)
- [ ] Payment Processing (NOWPayments + Crypto addresses)
- [ ] Blockchain API Keys (for payment verification)
- [ ] Devin AI (for agent deployment)
- [ ] Demo Mode (optional, for testing)

---

## 1. Database

### Development (SQLite - Default)
```env
# No env vars needed - uses dev.db file
```

### Production (PostgreSQL via Prisma)
```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**Get PostgreSQL from:**
- Vercel Postgres: https://vercel.com/storage/postgres
- Neon: https://neon.tech
- Supabase: https://supabase.com
- Railway: https://railway.app

---

## 2. Payment Processing

### NOWPayments (Crypto Payment Gateway)
```env
NOWPAYMENTS_API_KEY="your_api_key_here"
NEXT_PUBLIC_NOWPAYMENTS_PUBLIC_KEY="your_public_key_here"
```

**Get API keys:** https://account.nowpayments.io/create-account

### Crypto Payment Addresses (Your Wallet Addresses)

```env
# EVM Chains (Ethereum, BSC, Base, Arbitrum, etc.)
EVM_PAYMENT_ADDRESS="0xYourWalletAddress"

# Solana
SOL_PAYMENT_ADDRESS="YourSolanaWalletAddress"

# Tron
TRON_PAYMENT_ADDRESS="YourTronWalletAddress"
```

**Supported Payment Currencies:**
- USDT (BSC, Solana, Tron)
- USDC (Base, Solana)
- ETH, BNB, SOL, TRX

---

## 3. Blockchain API Keys (For Payment Verification)

### Required for Payment Confirmation

```env
# BSC Chain Verification
BSCSCAN_API_KEY="your_bscscan_api_key"

# Base Chain Verification
BASESCAN_API_KEY="your_basescan_api_key"

# Arbitrum Verification
ARBISCAN_API_KEY="your_arbiscan_api_key"

# Solana Verification
HELIUS_API_KEY="your_helius_api_key"

# Tron Verification
TRONGRID_API_KEY="your_trongrid_api_key"
```

**Get API Keys:**
- BSCScan: https://bscscan.com/apis
- BaseScan: https://basescan.org/apis
- Arbiscan: https://arbiscan.io/apis
- Helius (Solana): https://helius.xyz
- TronGrid: https://www.trongrid.io

---

## 4. Devin AI (Agent Deployment)

Devin AI builds and deploys your agents automatically.

### Get Your API Key

1. Go to: https://preview.devin.ai/settings
2. Click "API Keys"
3. Generate a new key
4. Copy the key (starts with `devin-`)

### Configuration

```env
DEVIN_API_KEY="devin_your_api_key_here"
```

### Testing Devin Connection

```bash
# Test if Devin API is working
curl -H "Authorization: Bearer $DEVIN_API_KEY" \
  https://api.devin.ai/v1/sessions
```

### Without Devin API Key (Demo Mode)

If you don't have a Devin API key yet, the app will:
- Create mock sessions for testing
- Simulate deployment progress
- Show fake "completed" status after ~5 seconds

This is useful for UI testing without using Devin credits.

### Devin Pricing

Devin charges per session:
- Check current pricing: https://preview.devin.ai/pricing
- Each agent deployment = 1 session
- Monitor usage in Devin dashboard

---

## 5. Demo Mode (Optional)

```env
# Enable demo mode for testing without real payments
NEXT_PUBLIC_DEMO_MODE="true"

# Skip payment verification (dev only)
SKIP_PAYMENT_CHECK="true"
```

⚠️ **Never enable DEMO_MODE in production!**

---

## 6. Affiliate System (Future Implementation)

When affiliate system is added, you'll need:

```env
# JWT Secret for affiliate tokens
AFFILIATE_JWT_SECRET="your_secret_here"

# Commission percentage
AFFILIATE_COMMISSION_PERCENT="20"

# Cookie duration (days)
AFFILIATE_COOKIE_DAYS="30"
```

---

## 7. HyperEVM / USDH Payments (Self-Hosted)

For accepting USDH payments on HyperEVM with auto-transfers:

```env
# HyperEVM RPC
HYPEREVM_RPC_URL="https://rpc.hyperliquid.xyz/evm"

# USDH Token Contract
USDH_CONTRACT_ADDRESS="0x54e00a5988577cb0b0c9ab0cb6ef7f4b"

# Master wallet (receives all USDH payments - PUBLIC ADDRESS ONLY)
HYPEREVM_MASTER_WALLET="0xYourMasterWalletAddress"

# PM Wallet (hot wallet that pays gas for transfers - PRIVATE KEY)
# This is a SEPARATE hot wallet with small amount of HYPE (~0.5 HYPE)
# It funds burner wallets and executes transfers
PM_WALLET_KEY="0xYourHotWalletPrivateKey"

# Wallet encryption key (32+ chars)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
WALLET_ENCRYPTION_KEY="your-64-char-hex-key"

# Admin API token for wallet pool management
ADMIN_AUTH_TOKEN="your-random-token"
```

**Security Model:**
- **Master Wallet**: Cold storage, only address is in env vars (receives USDH)
- **PM Wallet**: Hot wallet with minimal HYPE (~0.5) for gas (pays transfer fees)
- **Burner Wallets**: Generated dynamically, encrypted in DB (temporary payment holders)

**Setup Steps:**
1. Create a **cold storage master wallet** - save the address (this receives USDH)
2. Create a **hot PM wallet** - fund with ~0.5 HYPE, put private key in `PM_WALLET_KEY`
3. Generate burner wallets in DB
4. Done!

---

## 8. Analytics (Optional)

```env
# Vercel Analytics (auto-enabled on Vercel)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=""

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=""
NEXT_PUBLIC_POSTHOG_HOST=""
```

---

## Complete .env.local Template

```env
# ============================================
# Meet Matt - Environment Configuration
# ============================================

# Database (PostgreSQL for production)
# DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# NOWPayments (Crypto Payment Gateway)
NOWPAYMENTS_API_KEY=""
NEXT_PUBLIC_NOWPAYMENTS_PUBLIC_KEY=""

# Crypto Payment Addresses (Your Wallets)
EVM_PAYMENT_ADDRESS=""
SOL_PAYMENT_ADDRESS=""
TRON_PAYMENT_ADDRESS=""

# Blockchain API Keys (for payment verification)
BSCSCAN_API_KEY=""
BASESCAN_API_KEY=""
ARBISCAN_API_KEY=""
HELIUS_API_KEY=""
TRONGRID_API_KEY=""

# Devin AI (Agent Deployment)
DEVIN_API_KEY=""

# Demo Mode (set to "true" for testing)
NEXT_PUBLIC_DEMO_MODE="false"
SKIP_PAYMENT_CHECK="false"

# Affiliate System (when implemented)
# AFFILIATE_JWT_SECRET=""
# AFFILIATE_COMMISSION_PERCENT="20"
# AFFILIATE_COOKIE_DAYS="30"
```

---

## Testing Checklist

After setting up ENV vars, test:

1. **Database Connection**
   ```bash
   npx prisma db push
   npx prisma studio
   ```

2. **Payment Flow**
   - Enable DEMO_MODE
   - Complete a test deployment
   - Check payment modal appears

3. **Crypto Verification**
   - Make a small test payment
   - Check if webhook/verification works
   - Verify agent deployment starts

4. **Devin Integration**
   - Check Devin API key is valid
   - Test agent deployment
   - Monitor deployment status

---

## Security Notes

- Never commit `.env.local` to git
- Rotate API keys regularly
- Use separate wallets for production
- Enable 2FA on all services
- Monitor API usage for abuse

---

## Support

For issues with:
- **NOWPayments**: support@nowpayments.io
- **Devin AI**: support@cognition.ai
- **Prisma**: https://prisma.io/support
- **Vercel**: https://vercel.com/support
