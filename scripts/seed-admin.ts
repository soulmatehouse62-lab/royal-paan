// Creates the first "admin" account with a random password, printed once.
import "./load-env";
import { PrismaClient } from "@prisma/client";
import { generatePassword, hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (existing) {
    console.log('An "admin" account already exists. To reset its password run:');
    console.log('  npm run user:create -- --username admin --reset');
    return;
  }
  const password = generatePassword("admin");
  await prisma.user.create({
    data: { username: "admin", name: "Admin", role: "ADMIN", passwordHash: await hashPassword(password) },
  });
  console.log("\nCreated admin account. This password is shown only once:\n");
  console.log(`  username: admin\n  password: ${password}\n`);
  console.log("Sign in and change it from the Account page.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
