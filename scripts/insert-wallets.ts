/**
 * Insert burner wallets into database
 * Usage: npx ts-node scripts/insert-wallets.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GENERATED HYPEREVM WALLETS - Fund each with 0.001-0.002 HYPE
const WALLETS = [
  {
    id: 'wallet_1',
    publicKey: '0x80ED6c78c12Eef9260bEA59DDCC449Bb1BA4C251',
    privateKey: '0x162a858745b4c652988d82f1be1829d1988dce1e5158ccab784c0c57982f7a22',
  },
  {
    id: 'wallet_2',
    publicKey: '0x697Fc23A473dEE565EA9B9B84a40aC31e1B1a340',
    privateKey: '0xab76b23046eedd247cc27aa74dc999be6aeb92c19e0af09dc18296768739805e',
  },
  {
    id: 'wallet_3',
    publicKey: '0x8103BbeAa865855dc729112fac645e5BAa6bF8D9',
    privateKey: '0xbb07c19a703702893da3df5d837a4af2115ac3fe53b8b40437fef84a67b07ece',
  },
  {
    id: 'wallet_4',
    publicKey: '0x88675469Fcf3b77e01BfBD1f244E283a8BeA9150',
    privateKey: '0x94ed47245ff7a20b6f09c8ce034f79ec57d9d5af62db2ba11ad2484834ff29af',
  },
  {
    id: 'wallet_5',
    publicKey: '0xc59F32f36a9AFE50Ae55986ab010693965d21b85',
    privateKey: '0xbbbcab499ec4c2b51b6ab5508730dc655f0af531c99506f39bdd4df3262be0b8',
  },
];

async function main() {
  console.log(`Inserting ${WALLETS.length} wallets into database...\n`);

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
        id: wallet.id,
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
