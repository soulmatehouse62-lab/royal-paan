// Rebuilds the Customer collection from existing orders (latest name and visit per phone).
import "./load-env";
import { PrismaClient } from "@prisma/client";
import { nameWords, phoneKey } from "../src/lib/phone";

const prisma = new PrismaClient();

async function main() {
  const customers = new Map<string, { phone: string; name: string | null; lastVisitAt: Date }>();
  let cursor: string | undefined;
  let scanned = 0;

  for (;;) {
    const batch = await prisma.order.findMany({
      where: { customerPhone: { not: null } },
      orderBy: { id: "asc" },
      take: 1000,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, customerPhone: true, customerName: true, createdAt: true },
    });
    for (const o of batch) {
      const key = phoneKey(o.customerPhone);
      if (!key || !o.customerPhone) continue;
      const prev = customers.get(key);
      if (!prev || o.createdAt >= prev.lastVisitAt) {
        customers.set(key, { phone: o.customerPhone, name: o.customerName ?? prev?.name ?? null, lastVisitAt: o.createdAt });
      } else if (!prev.name && o.customerName) {
        prev.name = o.customerName;
      }
    }
    scanned += batch.length;
    if (batch.length < 1000) break;
    cursor = batch[batch.length - 1].id;
  }

  // Make sure every order has its phoneKey too.
  const missing = await prisma.order.findMany({ where: { customerPhone: { not: null }, phoneKey: null }, select: { id: true, customerPhone: true } });
  for (const o of missing) await prisma.order.update({ where: { id: o.id }, data: { phoneKey: phoneKey(o.customerPhone) } });

  await prisma.customer.deleteMany();
  const data = [...customers.entries()].map(([key, c]) => ({ phoneKey: key, phone: c.phone, name: c.name, nameWords: nameWords(c.name), lastVisitAt: c.lastVisitAt }));
  for (let i = 0; i < data.length; i += 500) await prisma.customer.createMany({ data: data.slice(i, i + 500) });

  console.log(`Scanned ${scanned} orders, fixed ${missing.length} phone keys, rebuilt ${data.length} customers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
