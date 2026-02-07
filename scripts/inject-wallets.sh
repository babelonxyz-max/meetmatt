#!/bin/bash
# HyperEVM Wallet Injector - Paste your DATABASE_URL below

# === PASTE YOUR DATABASE_URL HERE ===
export DATABASE_URL="PASTE_YOUR_DATABASE_URL_HERE"
# =====================================

if [ "$DATABASE_URL" = "PASTE_YOUR_DATABASE_URL_HERE" ]; then
  echo "❌ ERROR: Please edit this script and paste your DATABASE_URL"
  exit 1
fi

echo "🔌 Connecting to database..."
cd "$(dirname "$0")/.." && npx ts-node scripts/insert-wallets.ts
