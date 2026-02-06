# Vercel Postgres Setup Guide

Complete guide to set up Vercel Postgres for the secure wallet pool.

---

## Step 1: Create Database (2 minutes)

### 1.1 Go to Vercel Dashboard
```
https://vercel.com/dashboard
```

### 1.2 Navigate to Storage
1. Click **"Storage"** tab (next to Overview, Deployments)
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Choose region (recommend same as your project)
5. Click **"Create"**

### 1.3 Connect to Project
1. Click **"Connect Project"**
2. Select your **meetmatt** project
3. Click **"Connect"**

✅ This automatically adds `DATABASE_URL` to your environment variables!

---

## Step 2: Run Migration (30 seconds)

Once database is connected, run these commands:

```bash
# Navigate to project
cd meetmatt

# Deploy database changes
npx prisma migrate deploy

# Or if that doesn't work, run directly on database:
npx prisma db push
```

---

## Step 3: Generate Wallet Pool (1 minute)

After migration succeeds, generate wallets:

```bash
# Get your admin token from Vercel
npx vercel env ls

# Copy the ADMIN_AUTH_TOKEN value

# Generate 100 wallets
curl -X POST https://meetmatt.vercel.app/api/admin/wallet-pool \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"count": 100}'
```

---

## Step 4: Verify Setup (30 seconds)

```bash
# Check pool status
curl https://meetmatt.vercel.app/api/admin/wallet-pool \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_HERE"
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

## Alternative: Manual SQL Setup

If you prefer to run SQL directly:

### Option A: Vercel Postgres Dashboard
1. Go to https://vercel.com/dashboard → Storage → Your Database
2. Click **"Query"** tab
3. Run this SQL:

```sql
-- Create WalletPool table
CREATE TABLE "wallet_pool" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "address" TEXT NOT NULL UNIQUE,
  "encrypted_private_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'available',
  "assigned_to_session" TEXT,
  "assigned_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX "wallet_pool_status_idx" ON "wallet_pool"("status");
CREATE INDEX "wallet_pool_assigned_to_session_idx" ON "wallet_pool"("assigned_to_session");
```

### Option B: psql CLI
```bash
# Get connection string from Vercel Dashboard
psql "YOUR_POSTGRES_URL_HERE"

# Then paste the SQL above
```

---

## Troubleshooting

### Error: "database does not exist"
- Database is still provisioning (wait 1-2 minutes)
- Try again

### Error: "permission denied"
- Check that project is connected to database
- Verify environment variable is set

### Error: "relation already exists"
- Migration already ran
- Skip to Step 3 (generate wallets)

---

## What Gets Created

After setup, your database will have:

```
Tables:
├── Agent          (existing)
├── Payment        (existing)
└── WalletPool     (new)
    ├── id                     (UUID)
    ├── address                (ETH address)
    ├── encrypted_private_key  (AES-256 encrypted)
    ├── status                 (available/assigned/used)
    ├── assigned_to_session    (user session ID)
    ├── assigned_at            (timestamp)
    └── created_at             (timestamp)
```

---

## Next Steps After Setup

1. ✅ Database created
2. ✅ Migration run
3. ✅ Wallet pool generated (100 wallets)
4. 🔄 Ready for USDH payments!

Users can now pay with USDH and funds will be securely transferred to your master wallet.

---

## Quick Checklist

- [ ] Created Vercel Postgres database
- [ ] Connected database to meetmatt project
- [ ] Ran `npx prisma migrate deploy`
- [ ] Generated wallet pool (100 wallets)
- [ ] Verified pool stats show 100 available

---

## Need Help?

If stuck on any step, tell me which step and I'll create more detailed instructions.
