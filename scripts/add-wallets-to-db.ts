/**
 * Add burner wallets to database for USDH payments
 * 
 * Usage:
 * 1. Replace the WALLETS array below with your actual wallets
 * 2. Ensure DATABASE_URL is set in .env
 * 3. Run: npx ts-node scripts/add-wallets-to-db.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// REPLACE THESE with your actual wallets (publicKey + privateKey)
const WALLETS: { publicKey: string; privateKey: string }[] = [
  // Example - replace with your funded wallets:
  // {
  //   publicKey: 'YOUR_PUBLIC_KEY_HERE',
  //   privateKey: '[1,2,3,...64_numbers]',
  // },
];

async function main() {
  if (WALLETS.length === 0) {
    console.log('❌ Please add your wallets to the WALLETS array first!');
    process.exit(1);
  }

  console.log(`Adding ${WALLETS.length} wallets to database...\n`);

  for (const wallet of WALLETS) {
    const existing = await prisma.walletPool.findUnique({
      where: { publicKey: wallet.publicKey }
    });

    if (existing) {
      console.log(`⚠️  Wallet ${wallet.publicKey.slice(0, 20)}... already exists`);
      continue;
    }

    await prisma.walletPool.create({
      data: {
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        isAvailable: true,
      }
    });

    console.log(`✅ Added: ${wallet.publicKey}`);
  }

  const total = await prisma.walletPool.count();
  console.log(`\n📊 Total wallets in pool: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
