#!/bin/bash

# Meet Matt - Wallet Pool Setup Script
# Run this after Vercel Postgres is connected

echo "🔧 Setting up secure wallet pool..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the meetmatt directory"
    exit 1
fi

echo "Step 1: Deploying database migration..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "❌ Migration failed. Trying prisma db push..."
    npx prisma db push --accept-data-loss
fi

echo ""
echo "Step 2: Generating wallet pool..."
echo "Fetching admin token from Vercel..."

# Get admin token
ADMIN_TOKEN=$(npx vercel env ls 2>/dev/null | grep ADMIN_AUTH_TOKEN | awk '{print $2}')

if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ ADMIN_AUTH_TOKEN not found in environment variables"
    echo "Please set it first: echo 'your-token' | npx vercel env add ADMIN_AUTH_TOKEN production"
    exit 1
fi

echo "Generating 100 wallets..."
curl -X POST https://meetmatt.vercel.app/api/admin/wallet-pool \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": 100}'

echo ""
echo ""
echo "Step 3: Verifying setup..."
curl https://meetmatt.vercel.app/api/admin/wallet-pool \
  -H "Authorization: Bearer $ADMIN_TOKEN"

echo ""
echo ""
echo "✅ Setup complete!"
echo ""
echo "Your wallet pool is ready for USDH payments."
echo "Master wallet: 0xbd24E200A8A7bE83c810039a073E18abD8362B6e"
