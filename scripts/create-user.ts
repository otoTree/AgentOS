import { prisma } from "../src/lib/prisma";
import { hash } from "bcryptjs";

async function main() {
  const email = "test@example.com";
  // 简单的 hash，实际应用应匹配 auth.config 中的逻辑
  // 这里假设 auth.config 用的是 bcrypt
  const password = await hash("password", 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: { password },
    create: {
      email,
      name: "Test User",
      password,
    },
  });
  
  console.log("User upserted:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());