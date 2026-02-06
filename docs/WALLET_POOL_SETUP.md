# Wallet Pool & Gas Funding Setup

## Overview
The wallet pool system provides:
1. **Pre-generated encrypted wallets** - Stored securely in database
2. **Gas funding** - Each wallet funded with 0.05 HYPER (~$1)
3. **Auto-transfer** - USDH automatically sent to master wallet after payment
4. **Recovery** - Admin can recover stuck funds

## Architecture

```
User Payment Flow:
1. User clicks "Pay with USDH" 
2. System assigns burner wallet from pool
3. User sends USDH to burner wallet
4. System detects payment
5. Burner wallet transfers USDH to master (using its HYPER gas)
6. Wallet marked as "used"

Gas Management:
- Each wallet starts with 0.05 HYPER
- Refills automatically when below 0.01 HYPER
- Master wallet funds gas
```

## Setup Steps

### 1. Fund Master Wallet
Send HYPER to your master wallet:
```
Address: 0xbd24E200A8A7bE83c810039a073E18abD8362B6e
```

You'll need ~5 HYPER to fund 100 wallets (0.05 each).

### 2. Set Environment Variables
```bash
HYPEREVM_MASTER_KEY=your-master-wallet-private-key
HYPEREVM_MASTER_WALLET=0xbd24E200A8A7bE83c810039a073E18abD8362B6e
```

### 3. Generate Wallets with Gas
```bash
# Generate 100 wallets and fund them
npx tsx scripts/generate-wallets.ts 100

# Or if wallets already exist, fund them:
npx tsx scripts/fund-wallets.ts
```

### 4. Check Pool Status
```bash
curl http://localhost:3000/api/admin/wallet-pool \
  -H "Authorization: Bearer <ADMIN_AUTH_TOKEN>"
```

## Gas Calculation

**Cost per transfer:**
- Gas price: ~0.001 Gwei
- ERC20 transfer: ~65,000 gas
- Cost: 65,000 × 0.001 Gwei = 0.000065 HYPER (~$0.0013)

**One wallet with 0.05 HYPER can do ~769 transfers**

## Recovery Procedures

### Wallet Runs Out of Gas
System automatically detects and refills from master wallet.

### Funds Stuck in Wallet
```bash
# Recover all USDH from a stuck wallet
POST /api/admin/wallet-pool/recover
{
  "walletId": "wallet-id",
  "toAddress": "optional-custom-address"
}
```

### Regenerate Pool
```bash
# Clear and regenerate wallets
npx tsx scripts/generate-wallets.ts 100
```

## Monitoring

Check these metrics regularly:
- **Available wallets** (alert if < 10)
- **Wallets with gas** (alert if < 20%)
- **Master wallet HYPER balance** (alert if < 10 HYPER)

## Security

- **Private keys**: AES-256-GCM encrypted in database
- **Master key**: Never exposed to frontend
- **Burner wallets**: Single-use, marked as "used" after transfer
- **Gas funding**: Only from master wallet

## Troubleshooting

### "No wallets available"
- Generate more: `npx tsx scripts/generate-wallets.ts 100`
- Check database: `SELECT COUNT(*) FROM wallet_pool WHERE status='available'`

### "Insufficient gas"
- Fund master wallet with HYPER
- Run: `npx tsx scripts/fund-wallets.ts`

### "Transfer failed"
- Check burner wallet has HYPER: `eth_getBalance`
- Check USDH balance: `balanceOf`
- Manually recover via admin API
