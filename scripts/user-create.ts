// npm run user:create -- --username NAME --name "Full Name" --role ADMIN|STAFF
// npm run user:create -- --username NAME --reset      (password recovery)
import "./load-env";
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";
import { USERNAME_RE, generatePassword, hashPassword, normalizeUsername } from "../src/lib/auth/password";

const prisma = new PrismaClient();

const { values } = parseArgs({
  options: {
    username: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "STAFF" },
    reset: { type: "boolean", default: false },
  },
});

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const username = normalizeUsername(values.username ?? "");
  if (!USERNAME_RE.test(username)) fail("Give a --username of 3–32 letters, numbers, dots, dashes or underscores.");
  const password = generatePassword(username);

  if (values.reset) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) fail(`No account called "${username}".`);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), passwordChangedAt: new Date(), isActive: true },
    });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.loginThrottle.deleteMany({ where: { id: `user:${username}` } });
    console.log(`\nPassword reset for "${username}" (all their sessions ended, account enabled, lock cleared).`);
  } else {
    const role = (values.role ?? "STAFF").toUpperCase();
    if (role !== "ADMIN" && role !== "STAFF") fail("--role must be ADMIN or STAFF.");
    if (!values.name?.trim()) fail('Give a --name, e.g. --name "Ramesh Kumar".');
    if (await prisma.user.findUnique({ where: { username } })) fail(`"${username}" already exists. Use --reset to set a new password.`);
    await prisma.user.create({
      data: { username, name: values.name.trim(), role, passwordHash: await hashPassword(password) },
    });
    console.log(`\nCreated ${role.toLowerCase()} account "${username}".`);
  }
  console.log(`This password is shown only once:\n\n  ${password}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
