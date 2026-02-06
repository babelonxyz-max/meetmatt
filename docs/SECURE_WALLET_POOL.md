# Secure Wallet Pool for USDH Payments

## Overview

Pre-generated encrypted wallets stored in PostgreSQL database for secure USDH payment processing.

---

## How It Works

```
1. PRE-GENERATE: Create 100+ wallets, encrypt private keys, store in DB
2. ASSIGN: When user pays, assign next available wallet from pool
3. MONITOR: Poll blockchain for deposit to assigned wallet
4. TRANSFER: Use stored private key to transfer funds to master wallet
5. CLEANUP: Mark wallet as "used" in pool
```

---

## Setup Instructions

### 1. Add Environment Variables

```env
WALLET_ENCRYPTION_KEY="your-32-character-encryption-key-here"
ADMIN_AUTH_TOKEN="your-secret-admin-token"
```

**Important:**
- `WALLET_ENCRYPTION_KEY` must be exactly 32+ characters
- Store this securely - if lost, you can't decrypt private keys!
- `ADMIN_AUTH_TOKEN` for generating wallet pool

### 2. Run Database Migration

```bash
cd meetmatt
npx prisma migrate dev --name add_wallet_pool
```

### 3. Generate Wallet Pool

```bash
# Generate 100 wallets
curl -X POST https://meetmatt.vercel.app/api/admin/wallet-pool \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"count": 100}'
```

### 4. Check Pool Status

```bash
curl https://meetmatt.vercel.app/api/admin/wallet-pool \
  -H "Authorization: Bearer your-admin-token"
```

Expected response:
```json
{
  "success": true,
  "stats": {
    "total": 100,
    "available": 100,
    "assigned": 0,
    "used": 0
  }
}
```

---

## Security Features

### 1. Encryption
- Private keys encrypted with AES-256
- Encryption key stored in environment variable
- Keys never exposed in logs or API responses

### 2. Database Storage
- Wallets stored in PostgreSQL
- Survives server restarts
- Backup with your database

### 3. Access Control
- Admin endpoints require Bearer token
- Private keys only retrieved when needed for transfer

---

## Wallet Lifecycle

| Status | Description |
|--------|-------------|
| `available` | Ready to be assigned to new payment |
| `assigned` | Assigned to active payment session |
| `used` | Funds transferred, wallet retired |

---

## Recovery

### If Transfer Fails
```typescript
// Use admin endpoint to recover stuck funds
const privateKey = await exportWalletPrivateKey(walletId, adminToken);
// Manually transfer or retry
```

### If Database is Lost
- Restore from database backup
- Or regenerate new wallet pool (users with pending payments will need new wallets)

---

## Monitoring

### Check Pool Health
```bash
curl https://meetmatt.vercel.app/api/admin/wallet-pool \
  -H "Authorization: Bearer your-admin-token"
```

### When to Generate More Wallets
- When `available` count drops below 20
- Generate in batches of 100

---

## Cost Benefits

| Metric | Old System | New System |
|--------|-----------|------------|
| Private key storage | Memory (lost on restart) | Database (persistent) |
| Security | Low | High (encrypted) |
| Recovery | Impossible | Possible with admin tools |
| Scalability | Limited | Unlimited (just add more wallets) |

---

## Important Notes

1. **Never lose your `WALLET_ENCRYPTION_KEY`** - you won't be able to decrypt private keys
2. **Backup your database regularly** - contains encrypted wallet data
3. **Monitor pool levels** - ensure you always have available wallets
4. **Use strong admin token** - prevents unauthorized access

---

## Next Steps

1. Set environment variables in Vercel
2. Run database migration
3. Generate initial wallet pool (100 wallets)
4. Test with small payment
5. Monitor pool usage
