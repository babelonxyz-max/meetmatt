const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({ take: 5 });
    console.log('Users in DB:', users.length);
    users.forEach(u => console.log('  -', u.email || u.privyId || u.id));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
