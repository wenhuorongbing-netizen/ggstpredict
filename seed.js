const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { username: 'test_user' },
    update: {},
    create: {
      username: 'test_user',
      password: 'password123',
      points: 1000,
      role: 'ADMIN',
    },
  });

  await prisma.match.create({
    data: {
      playerA: 'Sol Badguy',
      playerB: 'Ky Kiske',
      status: 'OPEN',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
