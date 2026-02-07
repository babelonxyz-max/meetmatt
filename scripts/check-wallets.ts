import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking wallet pool...\n');
  
  const wallets = await prisma.walletPool.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  if (wallets.length === 0) {
    console.log('❌ No wallets found in database!');
    process.exit(1);
  }
  
  console.log(`✅ Found ${wallets.length} wallet(s):\n`);
  console.log('ID | Address | Status | Assigned');
  console.log('---|---------|--------|----------');
  
  wallets.forEach(w => {
    const shortAddr = w.address.slice(0, 12) + '...' + w.address.slice(-6);
    const assigned = w.assignedToSession ? w.assignedToSession.slice(0, 10) + '...' : 'none';
    const status = w.status === 'available' ? '✅' : '❌';
    console.log(`${w.id} | ${shortAddr} | ${status} ${w.status} | ${assigned}`);
  });
  
  const available = wallets.filter(w => w.status === 'available').length;
  console.log(`\n📊 Summary: ${available}/${wallets.length} available for payments`);
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
