# Get DATABASE_URL from Vercel

Since you already have Vercel Postgres, here's how to get the connection string:

## Option 1: Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Click **"Storage"** tab
3. Click your **Postgres** database
4. Click **".env.local"** tab
5. Copy the `DATABASE_URL` line
6. Paste it into your `.env.local` file

## Option 2: Vercel CLI

```bash
# Pull all env vars from Vercel
cd meetmatt
npx vercel env pull

# This creates/overwrites .env file with all secrets
```

## What You're Looking For

It will look like this:
```env
DATABASE_URL="postgres://default:xxxxxx@xxxxxx-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require"
```

## After Adding DATABASE_URL

Run the migration:
```bash
cd meetmatt
npx prisma migrate deploy
```

Then generate wallets:
```bash
curl -X POST https://meetmatt.vercel.app/api/admin/wallet-pool \
  -H "Authorization: Bearer [your-admin-token]" \
  -d '{"count": 100}'
```

---

**Once you add DATABASE_URL, everything will work!**
