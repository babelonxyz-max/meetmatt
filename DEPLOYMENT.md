# Production Deployment - Meet Matt

## ⚠️ CRITICAL: BACKUP YOUR ENCRYPTION KEY

The `WALLET_ENCRYPTION_KEY` is used to encrypt all burner wallet private keys.
**If you lose this key, you CANNOT recover the wallets or any funds in them!**

### Your Encryption Key (SAVE THIS!):
```
WALLET_ENCRYPTION_KEY=your-32-char-encryption-key-here!!!
```

**Store in:**
- Password manager (1Password, Bitwarden)
- Secure note (iCloud Keychain, Google Passwords)
- Hardware security key
- Printed copy in safe

**Never store in:**
- Unencrypted text file
- Email
- Slack/Discord
- Git repository

---

## Deployment Checklist

### Environment Variables (Vercel)

| Variable | Value | Status |
|----------|-------|--------|
| `DATABASE_URL` | Neon PostgreSQL | ✅ Already set |
| `NEXT_PUBLIC_PRIVY_APP_ID` | cmlaa4ahl00vqjr0dqo4kl03s | ✅ Set |
| `PRIVY_APP_SECRET` | privy_app_secret_... | ✅ Set |
| `PM_WALLET_KEY` | 0xa5b47cd... | ✅ Set |
| `HYPEREVM_MASTER_WALLET` | 0xbd24E200... | ✅ Set |
| `WALLET_ENCRYPTION_KEY` | (generate) | ⚠️ NEEDS SET |
| `ADMIN_AUTH_TOKEN` | (generate) | ⚠️ NEEDS SET |
| `USDH_CONTRACT_ADDRESS` | HyperLiquid USDH | ⚠️ NEEDS SET |

---

## What We Built

### 1. Privy Authentication
- Email, Google, Twitter, Discord login
- Embedded MPC wallets (no MetaMask needed)
- User profiles linked to database

### 2. PM Wallet Architecture (98% cheaper!)
```
User pays USDH → Burner Wallet → PM executes transferFrom → Master Wallet
```
- PM wallet pays gas (0.001 HYPER per wallet)
- Master wallet receives all USDH
- 100 wallets = $2 instead of $100

### 3. Secure Wallet Pool
- 200 burner wallets generated
- Private keys AES-256-GCM encrypted
- Stored in Neon PostgreSQL
- Auto-assignment per session

### 4. Database Schema
- `users` - Privy auth, profiles
- `agents` - AI assistant deployments
- `payments` - Payment tracking
- `wallet_pool` - Encrypted burner wallets

---

## Post-Deployment Steps

### 1. Fund PM Wallet
Send HYPER to: `0x2cc517dACE1e0076211356edf0447c79a432449D`
Recommended: 5 HYPER for gas reserves

### 2. Approve Wallets (After Funding)
```bash
curl -X POST https://your-domain.com/api/admin/wallet-pool \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"count": 100}'
```

### 3. Test Payment Flow
1. Open website
2. Click "Get Started" (Privy login)
3. Create agent
4. Select "Pay with USDH"
5. Send test USDH to shown address
6. Verify auto-transfer to master

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   User      │────▶│ Privy Auth   │────▶│  Database       │
│             │     │ (Login)      │     │  (Neon)         │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                 │
┌─────────────┐     ┌──────────────┐            │
│   PM Wallet │────▶│ Burner Wallet│◄───────────┘
│   (Gas)     │     │ (Holds USDH) │
└──────┬──────┘     └──────┬───────┘
       │                   │
       └──────transferFrom─┘
                           │
                    ┌──────▼───────┐
                    │Master Wallet │
                    │(Receives all)│
                    └──────────────┘
```

---

## Emergency Contacts

If you lose encryption key:
- Cannot recover: Wallet private keys
- Can recover: Nothing (encrypted data is lost)
- Solution: Regenerate wallet pool (funds in existing wallets are lost)

If you lose PM wallet key:
- Cannot: Execute transfers, approve new wallets
- Can still: Use direct transfer (manual gas funding)
- Solution: Update env var with new PM wallet

---

Generated: $(date)
