const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expiresAt = Date.now() + 120 * 60 * 1000;
  const megaphoneMsg = {
    text: "Test Megaphone Message for UI Verification",
    author: "TestAdmin",
    expiresAt: expiresAt
  };

  const currentSetting = await prisma.systemSetting.findUnique({
    where: { key: "MEGAPHONE_MESSAGES" }
  });

  let messages = [];
  if (currentSetting && currentSetting.value) {
    try {
      messages = JSON.parse(currentSetting.value);
    } catch(e) {}
  }

  messages.push(megaphoneMsg);

  await prisma.systemSetting.upsert({
    where: { key: "MEGAPHONE_MESSAGES" },
    update: { value: JSON.stringify(messages) },
    create: { key: "MEGAPHONE_MESSAGES", value: JSON.stringify(messages) }
  });

  console.log("Megaphone message injected.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
