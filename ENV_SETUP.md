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

```env
DEVIN_API_KEY="your_devin_api_key"
```

**Get API key:** https://preview.devin.ai/settings

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

## 7. Analytics (Optional)

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
