import "server-only";
import { cache } from "react";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, withTransaction, ActionError, isObjectId, type Tx } from "@/lib/db";
import { normalizePhone, phoneKey, isValidPhone, nameWords } from "@/lib/phone";
import { discountAmount, totalsFromPayments, allocateOldestFirst, formatOrderNumber } from "@/lib/pricing";
import { formatMoney } from "@/lib/money";

// ---------- Validation ----------

const objectId = z.string().refine(isObjectId, "err.orderMissing");
const quantity = z.number().int().min(1, "err.qtyMin").max(999);
const paise = z.number().int().min(0).max(1_000_000_000);
export const methodSchema = z.enum(["CASH", "UPI", "CARD"]);

const customerSchema = z.object({
  customerName: z.string().trim().max(80).optional().nullable(),
  customerPhone: z
    .string()
    .trim()
    .max(25)
    .optional()
    .nullable()
    .refine((p) => !p || isValidPhone(p), "err.phoneDigits"),
  tableNumber: z.string().trim().max(10).optional().nullable(),
});

const discountSchema = z
  .object({
    type: z.enum(["FLAT", "PERCENT"]),
    value: z.number().min(0).max(10_000_000),
  })
  .nullable()
  .optional()
  .refine((d) => !d || d.type !== "PERCENT" || d.value <= 100, "err.percentMax");

const newLine = z.object({
  menuItemId: objectId,
  variantName: z.string().trim().max(40).optional().nullable(),
  quantity,
});

export const createOrderSchema = customerSchema.extend({
  items: z.array(newLine).min(1, "err.addItem").max(100),
  discount: discountSchema,
  payment: z.object({
    status: z.enum(["PAID", "PARTIAL", "UNPAID"]),
    amount: paise.optional(),
    method: methodSchema,
  }),
});

export const updateOrderSchema = customerSchema.extend({
  orderId: objectId,
  lines: z
    .array(
      z.union([
        z.object({ lineId: objectId, quantity }),
        newLine,
      ]),
    )
    .min(1, "err.addItem")
    .max(100),
  discount: discountSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

// ---------- Helpers ----------

type LineSnapshot = {
  menuItemId: string;
  itemName: string;
  itemNameHi: string | null;
  variantName: string | null;
  category: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

/** Price lines from the current menu. The client only sends ids, sizes and quantities. */
async function priceNewLines(lines: z.infer<typeof newLine>[]): Promise<LineSnapshot[]> {
  if (lines.length === 0) return [];
  const ids = Array.from(new Set(lines.map((l) => l.menuItemId)));
  const items = await prisma.menuItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, nameHi: true, price: true, variants: true, category: true, isAvailable: true },
  });
  const byId = new Map(items.map((i) => [i.id, i]));

  // Merge repeated item + size into one line.
  const merged = new Map<string, LineSnapshot>();
  for (const line of lines) {
    const item = byId.get(line.menuItemId);
    if (!item) throw new ActionError("err.itemRemoved");
    if (!item.isAvailable) throw new ActionError("err.itemUnavailable", { name: item.name });

    let unitPrice = item.price;
    let variantName: string | null = null;
    if (item.variants.length > 0) {
      const v = item.variants.find((x) => x.name === line.variantName);
      if (!v) throw new ActionError("err.chooseSize", { name: item.name });
      unitPrice = v.price;
      variantName = v.name;
    } else if (line.variantName) {
      throw new ActionError("err.noSizes", { name: item.name });
    }

    const key = `${item.id}|${variantName ?? ""}`;
    const prev = merged.get(key);
    const qty = (prev?.quantity ?? 0) + line.quantity;
    if (qty > 999) throw new ActionError("err.tooMany", { name: item.name });
    merged.set(key, {
      menuItemId: item.id,
      itemName: item.name,
      itemNameHi: item.nameHi ?? null,
      variantName,
      category: item.category,
      unitPrice,
      quantity: qty,
      lineTotal: unitPrice * qty,
    });
  }
  return [...merged.values()];
}

function discountFields(subtotal: number, discount: CreateOrderInput["discount"]) {
  const amount = discountAmount(subtotal, discount);
  const active = discount && discount.value > 0;
  return {
    discountType: active ? discount.type : null,
    discountValue: active ? discount.value : null,
    discountAmount: amount,
  };
}

function customerFields(input: z.infer<typeof customerSchema>) {
  const phone = normalizePhone(input.customerPhone);
  return {
    customerName: input.customerName || null,
    customerPhone: phone,
    phoneKey: phoneKey(phone),
    tableNumber: input.tableNumber || null,
  };
}

/** Claim the order inside a transaction by writing to it first. */
async function claimOrder(tx: Tx, orderId: string) {
  try {
    return await tx.order.update({ where: { id: orderId }, data: { updatedAt: new Date() }, select: { id: true, total: true } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new ActionError("err.orderMissing");
    }
    throw e;
  }
}

async function paidSum(tx: Tx, orderId: string): Promise<number> {
  const agg = await tx.payment.aggregate({ where: { orderId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

/** Keep the Customer collection in step with orders. Best effort: never fails a sale. */
export async function touchCustomer(phone: string | null, name: string | null, at = new Date()) {
  const key = phoneKey(phone);
  if (!phone || !key) return;
  const nameData = name ? { name, nameWords: nameWords(name) } : {};
  try {
    await prisma.customer.upsert({
      where: { phoneKey: key },
      create: { phoneKey: key, phone, name: name ?? null, nameWords: nameWords(name), lastVisitAt: at },
      update: { phone, lastVisitAt: at, ...nameData },
    });
  } catch (e) {
    console.error("Customer update failed", e);
  }
}

// ---------- Receipt ----------

const receiptSelect = {
  id: true,
  orderNumber: true,
  createdAt: true,
  customerName: true,
  customerPhone: true,
  tableNumber: true,
  subtotal: true,
  discountType: true,
  discountValue: true,
  discountAmount: true,
  total: true,
  amountPaid: true,
  balanceDue: true,
  status: true,
  items: {
    select: { id: true, menuItemId: true, itemName: true, itemNameHi: true, variantName: true, category: true, unitPrice: true, quantity: true, lineTotal: true },
    orderBy: { id: "asc" },
  },
  payments: { select: { id: true, amount: true, method: true, paidAt: true }, orderBy: { paidAt: "asc" } },
} satisfies Prisma.OrderSelect;

export type Receipt = Prisma.OrderGetPayload<{ select: typeof receiptSelect }>;

/** Cached per request, so metadata and the page share one query. */
export const getReceipt = cache(async (id: string): Promise<Receipt | null> => {
  if (!isObjectId(id)) return null;
  return prisma.order.findUnique({ where: { id }, select: receiptSelect });
});

// ---------- Mutations ----------

export async function createOrder(input: CreateOrderInput): Promise<Receipt> {
  const lines = await priceNewLines(input.items);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const discount = discountFields(subtotal, input.discount);
  const total = subtotal - discount.discountAmount;
  const customer = customerFields(input);

  let pay = 0;
  if (input.payment.status === "PAID") {
    // Extra cash handed over only works out the change; record the bill total.
    pay = total;
  } else if (input.payment.status === "PARTIAL") {
    pay = input.payment.amount ?? 0;
    if (pay <= 0) throw new ActionError("err.enterPaid");
    if (pay > total) throw new ActionError("err.paidOverTotal", { total: formatMoney(total) });
  }

  const order = await withTransaction(async (tx) => {
    const counter = await tx.counter.upsert({
      where: { id: "order" },
      create: { id: "order", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    // The payment below is the order's only payment, so SUM(payments) = pay.
    return tx.order.create({
      data: {
        orderNumber: counter.seq,
        ...customer,
        subtotal,
        ...discount,
        total,
        ...totalsFromPayments(total, pay),
        items: { create: lines },
        payments: pay > 0 ? { create: { amount: pay, method: input.payment.method } } : undefined,
      },
      select: receiptSelect,
    });
  });

  await touchCustomer(customer.customerPhone, customer.customerName, order.createdAt);
  return order;
}

export async function updateOrder(input: UpdateOrderInput): Promise<void> {
  const added = input.lines.filter((l): l is z.infer<typeof newLine> => "menuItemId" in l);
  const kept = input.lines.filter((l): l is { lineId: string; quantity: number } => "lineId" in l);
  const newLines = await priceNewLines(added);
  const customer = customerFields(input);

  await withTransaction(async (tx) => {
    await claimOrder(tx, input.orderId);
    const existing = await tx.orderItem.findMany({
      where: { orderId: input.orderId },
      select: { id: true, unitPrice: true, quantity: true },
    });
    const existingById = new Map(existing.map((e) => [e.id, e]));

    const keptQty = new Map<string, number>();
    for (const k of kept) {
      if (!existingById.has(k.lineId)) throw new ActionError("err.billChanged");
      keptQty.set(k.lineId, (keptQty.get(k.lineId) ?? 0) + k.quantity);
    }

    // Existing lines keep their original price; new lines use the current price.
    let subtotal = newLines.reduce((s, l) => s + l.lineTotal, 0);
    for (const [id, qty] of keptQty) subtotal += existingById.get(id)!.unitPrice * qty;

    const discount = discountFields(subtotal, input.discount);
    const total = subtotal - discount.discountAmount;
    const paid = await paidSum(tx, input.orderId);
    if (total < paid) {
      throw new ActionError("err.totalBelowPaid", { total: formatMoney(total), paid: formatMoney(paid) });
    }

    const removed = existing.filter((e) => !keptQty.has(e.id)).map((e) => e.id);
    if (removed.length) await tx.orderItem.deleteMany({ where: { id: { in: removed } } });
    for (const [id, qty] of keptQty) {
      const e = existingById.get(id)!;
      if (e.quantity !== qty) {
        await tx.orderItem.update({ where: { id }, data: { quantity: qty, lineTotal: e.unitPrice * qty } });
      }
    }
    if (newLines.length) {
      await tx.orderItem.createMany({ data: newLines.map((l) => ({ ...l, orderId: input.orderId })) });
    }

    await tx.order.update({
      where: { id: input.orderId },
      data: { ...customer, subtotal, ...discount, total, ...totalsFromPayments(total, paid) },
    });
  });

  await touchCustomer(customer.customerPhone, customer.customerName);
}

export async function addPayment(orderId: string, amount: number, method: z.infer<typeof methodSchema>) {
  if (!Number.isInteger(amount) || amount <= 0) throw new ActionError("err.amountPositive");
  return withTransaction(async (tx) => {
    const order = await claimOrder(tx, orderId);
    const paid = await paidSum(tx, orderId);
    const balance = order.total - paid;
    if (balance <= 0) throw new ActionError("err.alreadyPaid");
    if (amount > balance) throw new ActionError("err.overBalance", { due: formatMoney(balance) });
    await tx.payment.create({ data: { orderId, amount, method } });
    const totals = totalsFromPayments(order.total, paid + amount);
    await tx.order.update({ where: { id: orderId }, data: totals });
    return totals;
  });
}

export async function removePayment(orderId: string, paymentId: string) {
  await withTransaction(async (tx) => {
    const order = await claimOrder(tx, orderId);
    const res = await tx.payment.deleteMany({ where: { id: paymentId, orderId } });
    if (res.count === 0) throw new ActionError("err.paymentGone");
    const paid = await paidSum(tx, orderId);
    await tx.order.update({ where: { id: orderId }, data: totalsFromPayments(order.total, paid) });
  });
}

export async function deleteOrder(orderId: string) {
  await withTransaction(async (tx) => {
    await claimOrder(tx, orderId);
    await tx.orderItem.deleteMany({ where: { orderId } });
    await tx.payment.deleteMany({ where: { orderId } });
    await tx.order.delete({ where: { id: orderId } });
  });
}

/** Split one payment across a customer's open bills, oldest first. */
export async function collectForCustomer(key: string, amount: number, method: z.infer<typeof methodSchema>) {
  if (!/^\d{10}$/.test(key)) throw new ActionError("err.unknownCustomer");
  if (!Number.isInteger(amount) || amount <= 0) throw new ActionError("err.amountPositive");

  return withTransaction(async (tx) => {
    const open = await tx.order.findMany({
      where: { phoneKey: key, balanceDue: { gt: 0 } },
      orderBy: [{ createdAt: "asc" }, { orderNumber: "asc" }],
      select: { id: true, orderNumber: true, total: true },
    });
    if (open.length === 0) throw new ActionError("err.noOpenBills");
    const ids = open.map((o) => o.id);
    // Claim every bill before reading its payments.
    await tx.order.updateMany({ where: { id: { in: ids } }, data: { updatedAt: new Date() } });

    const sums = await tx.payment.groupBy({ by: ["orderId"], where: { orderId: { in: ids } }, _sum: { amount: true } });
    const paidById = new Map(sums.map((s) => [s.orderId, s._sum.amount ?? 0]));
    const bills = open.map((o) => ({ ...o, paid: paidById.get(o.id) ?? 0, balanceDue: o.total - (paidById.get(o.id) ?? 0) }));
    const due = bills.reduce((s, b) => s + Math.max(0, b.balanceDue), 0);
    if (amount > due) throw new ActionError("err.overTotalDue", { due: formatMoney(due) });

    const plan = allocateOldestFirst(bills, amount).filter((p) => p.apply > 0);
    const paidAt = new Date();
    await tx.payment.createMany({ data: plan.map((p) => ({ orderId: p.bill.id, amount: p.apply, method, paidAt })) });
    for (const p of plan) {
      await tx.order.update({ where: { id: p.bill.id }, data: totalsFromPayments(p.bill.total, p.bill.paid + p.apply) });
    }
    return plan.map((p) => `${formatOrderNumber(p.bill.orderNumber)}: ${formatMoney(p.apply)}`);
  });
}
