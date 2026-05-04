const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const session = await prisma.session.create({
      data: {
        userId: 'test-user-id',
        role: 'Dev',
        experienceLevel: 'Mid'
      }
    });
    console.log("Success:", session);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
