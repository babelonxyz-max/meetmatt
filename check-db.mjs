import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

console.log('========================================');
console.log('ODONATUM INVESTIGATION');
console.log('========================================');

// Get ODONATUM agent
const agent = await prisma.agent.findFirst({
  where: { name: 'ODONATUM' },
  include: { user: true }
});

console.log('\n1. AGENT DATA:');
console.log('   Agent ID:', agent?.id);
console.log('   Agent userId:', agent?.userId);
console.log('   Agent status:', agent?.status);
console.log('   Agent createdAt:', agent?.createdAt);

console.log('\n2. LINKED USER:');
console.log('   User ID:', agent?.user?.id);
console.log('   User privyId:', agent?.user?.privyId);
console.log('   User email:', agent?.user?.email);
console.log('   User wallet:', agent?.user?.walletAddress);

// Find all users with similar privyId pattern
console.log('\n3. ALL USERS WITH PRIVY ID STARTING WITH "cml":');
const allUsers = await prisma.user.findMany({
  where: { privyId: { startsWith: 'cml' } },
  orderBy: { createdAt: 'desc' }
});

allUsers.forEach((u, i) => {
  console.log(`   User ${i+1}:`, u.privyId, '|', u.email || 'no email', '|', u.walletAddress?.slice(0, 10)+'...' || 'no wallet');
});

// Find payments for ODONATUM
console.log('\n4. PAYMENTS:');
const payments = await prisma.payment.findMany({
  orderBy: { createdAt: 'desc' },
  take: 5
});
payments.forEach((p, i) => {
  console.log(`   Payment ${i+1}:`, p.status, p.amount, p.currency, '| user:', p.userId || 'no userId');
});

// Check if agent's user has the agent
console.log('\n5. VERIFY USER->AGENT RELATIONSHIP:');
if (agent?.userId) {
  const userAgents = await prisma.agent.findMany({
    where: { userId: agent.userId }
  });
  console.log('   User has', userAgents.length, 'agent(s):');
  userAgents.forEach(a => console.log('     -', a.name, '(', a.status, ')'));
}

console.log('\n========================================');
console.log('POSSIBLE ISSUES:');
console.log('========================================');

if (!agent?.userId) {
  console.log('❌ Agent has no userId!');
} else if (allUsers.length > 1) {
  console.log('⚠️  Multiple users found - user might have duplicate accounts');
  console.log('   Agent is linked to:', agent.user?.privyId);
  console.log('   User should check their wallet address in dashboard');
} else {
  console.log('✅ Only one user in system');
  console.log('   If user logged in with same wallet, they should see the agent.');
  console.log('   Check if wallet address matches:', agent?.user?.walletAddress);
}

await prisma.$disconnect();
