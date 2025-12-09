import { prisma } from "../src/lib/infra/prisma";

async function main() {
  const users = await prisma.user.findMany();
  console.log("Users in DB:", JSON.stringify(users, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });