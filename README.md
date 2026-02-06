# Meet Matt

AI agent deployment platform with crypto payments on HyperEVM.

## Features

- 🤖 Deploy AI assistants via Devin
- 💳 Pay with USDH (10% discount) or stablecoins
- 🔐 Secure wallet pool with PM relayer architecture
- 👤 User authentication via Privy (email, social, wallet)
- ⚡ 98% capital efficient gas management

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

```bash
# Copy template
cp .env.local.example .env.local

# Or run setup script (generates PM wallet + burner pool)
npx tsx scripts/setup-wallets.ts
```

### 3. Add Required Credentials

Get from [Privy Dashboard](https://dashboard.privy.io):

```bash
# Add to .env.local:
NEXT_PUBLIC_PRIVY_APP_ID=cm-xxx
PRIVY_APP_SECRET=xxx
```

Get `DATABASE_URL` from [Vercel Dashboard](https://vercel.com).

### 4. Fund PM Wallet

Send HYPER to the address shown by setup script:

```bash
# Check PM wallet
npx tsx scripts/setup-wallets.ts --pm-only

# Recommended: 5 HYPER for 100 wallets
```

### 5. Generate Burner Wallets

```bash
npx tsx scripts/setup-wallets.ts 100
```

### 6. Run Development Server

```bash
npm run dev
```

## Architecture

### PM Wallet Relayer Pattern

Instead of funding each burner wallet with 0.05 HYPER (~$1), we use a PM (Payment Manager) wallet:

```
User pays USDH → Burner Wallet
                        ↓
              PM executes transferFrom (pays gas)
                        ↓
                 Master Wallet (receives USDH)
```

**Benefits:**
- 98% cheaper: 0.001 HYPER per wallet vs 0.05 HYPER
- 100 wallets = $2 instead of $100
- PM wallet handles all gas costs

### Wallet Pool Flow

1. **Generate**: Create encrypted burner wallets (no gas needed)
2. **Assign**: PM funds 0.001 HYPER + approves itself to spend
3. **Payment**: User sends USDH to burner address
4. **Transfer**: PM executes `transferFrom` to master wallet
5. **Cleanup**: Wallet marked as "used"

## API Endpoints

### Payment

```bash
# Create USDH payment
POST /api/payment/hyperevm
{ "sessionId": "xxx", "userId": "optional" }

# Check payment status
GET /api/payment/hyperevm/status?sessionId=xxx
```

### Admin

```bash
# Get wallet pool stats
GET /api/admin/wallet-pool
Authorization: Bearer <ADMIN_AUTH_TOKEN>

# Generate more wallets
POST /api/admin/wallet-pool
{ "count": 100 }

# Recover stuck funds
PATCH /api/admin/wallet-pool
{ "walletId": "xxx" }
```

## Documentation

- [Environment Variables](docs/ENVIRONMENT_VARIABLES.md) - Complete setup guide
- [PM Wallet Architecture](docs/PM_WALLET_ARCHITECTURE.md) - How relayer works
- [Privy Setup](docs/PRIVY_SETUP.md) - Authentication configuration

## Tech Stack

- **Framework**: Next.js 15 + React 19
- **Auth**: Privy (email, social, embedded wallets)
- **Database**: PostgreSQL + Prisma
- **Blockchain**: HyperEVM (USDH payments)
- **Deployment**: Vercel

## License

MIT
