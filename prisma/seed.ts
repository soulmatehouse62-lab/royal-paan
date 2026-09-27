// Sample data for Royal Paan. Wipes menu, orders, payments, customers and the
// order counter. User accounts and sessions are left alone.
import "../scripts/load-env";
import { PrismaClient, type MenuItem, type PaymentMethod } from "@prisma/client";
import { nameWords, phoneKey } from "../src/lib/phone";
import { statusFor } from "../src/lib/pricing";

const prisma = new PrismaClient();
const r = (rupees: number) => rupees * 100;

const MENU: { name: string; nameHi: string; category: string; price?: number; variants?: { name: string; price: number }[] }[] = [
  { name: "Meetha Paan", nameHi: "मीठा पान", category: "Paan", price: r(40) },
  { name: "Chocolate Paan", nameHi: "चॉकलेट पान", category: "Paan", price: r(60) },
  { name: "Masala Chai", nameHi: "मसाला चाय", category: "Tea", variants: [{ name: "Medium", price: r(20) }, { name: "Large", price: r(30) }] },
  { name: "Cold Coffee", nameHi: "कोल्ड कॉफ़ी", category: "Shakes", variants: [{ name: "Medium", price: r(80) }, { name: "Large", price: r(110) }] },
  { name: "Mango Lassi", nameHi: "मैंगो लस्सी", category: "Lassi", variants: [{ name: "Medium", price: r(60) }, { name: "Large", price: r(90) }] },
  { name: "Paneer Butter Masala", nameHi: "पनीर बटर मसाला", category: "Main Course", price: r(220) },
  { name: "Dal Makhani", nameHi: "दाल मखनी", category: "Main Course", price: r(180) },
  { name: "Butter Naan", nameHi: "बटर नान", category: "Breads", price: r(45) },
  { name: "Veg Biryani", nameHi: "वेज बिरयानी", category: "Rice", price: r(190) },
  { name: "Gulab Jamun (2 pc)", nameHi: "गुलाब जामुन (2 पीस)", category: "Desserts", price: r(50) },
];

const CUSTOMERS = [
  { name: "Ramesh Sharma", phone: "9829012345" },
  { name: "Priya Meena", phone: "9414023456" },
  { name: "Vikram Singh Rathore", phone: "+919982034567" },
  { name: "Sunita Agarwal", phone: "7014045678" },
  { name: null, phone: null },
];

// Deterministic pseudo-random numbers so every seed looks the same.
let s = 42;
const rand = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

async function main() {
  console.log("Clearing menu, orders, payments and customers…");
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.counter.deleteMany();
  await prisma.menuItem.deleteMany();

  const items: MenuItem[] = [];
  for (const m of MENU) {
    const variants = m.variants ?? [];
    items.push(
      await prisma.menuItem.create({
        data: { name: m.name, nameHi: m.nameHi, category: m.category, variants, price: variants.length ? Math.min(...variants.map((v) => v.price)) : m.price! },
      }),
    );
  }
  console.log(`Created ${items.length} menu items.`);

  const now = Date.now();
  const kinds = ["PAID", "PAID", "PAID", "PARTIAL", "UNPAID"] as const;
  const methods: PaymentMethod[] = ["CASH", "UPI", "UPI", "CARD"];

  for (let n = 1; n <= 15; n++) {
    // Spread over the last 30 days, oldest first; the last two are from today.
    const daysAgo = n >= 14 ? 0 : Math.round(30 - n * 2.2);
    const createdAt = new Date(now - daysAgo * 86_400_000 - Math.floor(rand() * 6) * 3_600_000);
    const customer = pick(CUSTOMERS);

    const lines = Array.from({ length: 1 + Math.floor(rand() * 4) }, () => {
      const it = pick(items);
      const v = it.variants.length ? pick(it.variants) : null;
      const unitPrice = v ? v.price : it.price;
      const quantity = 1 + Math.floor(rand() * 3);
      return { menuItemId: it.id, itemName: it.name, itemNameHi: it.nameHi, variantName: v?.name ?? null, category: it.category, unitPrice, quantity, lineTotal: unitPrice * quantity };
    });
    const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
    const discountAmount = n % 5 === 0 ? Math.round(subtotal * 0.1) : 0;
    const total = subtotal - discountAmount;
    const kind = n === 15 ? "UNPAID" : n === 3 ? "PARTIAL" : pick([...kinds]);
    const paid = kind === "PAID" ? total : kind === "PARTIAL" ? Math.round(total / 200) * 100 : 0;
    const phone = customer.phone;

    await prisma.order.create({
      data: {
        orderNumber: n,
        customerName: customer.name,
        customerPhone: phone,
        phoneKey: phoneKey(phone),
        tableNumber: rand() > 0.5 ? String(1 + Math.floor(rand() * 12)) : null,
        subtotal,
        discountType: discountAmount ? "PERCENT" : null,
        discountValue: discountAmount ? 10 : null,
        discountAmount,
        total,
        amountPaid: paid,
        balanceDue: total - paid,
        status: statusFor(total, paid),
        createdAt,
        items: { create: lines },
        payments: paid ? { create: { amount: paid, method: pick(methods), paidAt: createdAt } } : undefined,
      },
    });
  }
  await prisma.counter.create({ data: { id: "order", seq: 15 } });
  console.log("Created 15 orders.");

  for (const c of CUSTOMERS) {
    const key = phoneKey(c.phone);
    if (!c.phone || !key) continue;
    const last = await prisma.order.findFirst({ where: { phoneKey: key }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    if (!last) continue;
    await prisma.customer.create({ data: { phoneKey: key, phone: c.phone, name: c.name, nameWords: nameWords(c.name), lastVisitAt: last.createdAt } });
  }
  console.log("Built customers. Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
