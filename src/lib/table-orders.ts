import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, withTransaction, ActionError, type Tx } from "@/lib/db";
import { createOrderSchema, customerFields, insertOrder, newLine, priceNewLines, touchCustomer, type LineSnapshot, type Receipt } from "@/lib/orders";
import type { SessionUser } from "@/lib/auth/session";

const tableNumber = z.string().trim().min(1).max(10);

export const sendKotSchema = z.object({
  tableNumber,
  items: z.array(newLine).min(1, "err.addItem").max(100),
});

export const settleTableSchema = createOrderSchema.omit({ items: true, tableNumber: true }).extend({ tableNumber });

export type SentLine = {
  key: string;
  menuItemId: string | null;
  name: string;
  nameHi: string | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
};

export type KotTicketView = {
  kotNumber: number;
  printedAt: Date;
  tableNumber: string;
  staffName: string;
  items: { name: string; nameHi: string | null; variantName: string | null; quantity: number }[];
};

// ---------- Admin: table setup ----------

export const tableSchema = z.object({
  tableNumber: z.string().trim().min(1, "err.tableNumber").max(10, "err.tableNumber"),
  name: z.string().trim().max(40).nullable().optional(),
  capacity: z.number().int().min(1, "err.capacity").max(50, "err.capacity"),
  area: z.enum(["INDOOR", "AC_HALL", "OUTDOOR", "OTHER"]),
  isActive: z.boolean(),
});
export type TableInput = z.infer<typeof tableSchema>;

function isDuplicate(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function createTable(input: TableInput) {
  try {
    await prisma.table.create({ data: { ...input, name: input.name || null } });
  } catch (e) {
    if (isDuplicate(e)) throw new ActionError("err.tableExists", { n: input.tableNumber });
    throw e;
  }
}

export async function updateTable(id: string, input: TableInput) {
  try {
    await withTransaction(async (tx) => {
      const table = await claimTableById(tx, id);
      // A running order is tied to this number and must stay visible until its bill is saved.
      if (table.activeOrderId && (input.tableNumber !== table.tableNumber || !input.isActive)) {
        throw new ActionError("err.tableBusy", { n: table.tableNumber });
      }
      await tx.table.update({ where: { id }, data: { ...input, name: input.name || null } });
    });
  } catch (e) {
    if (isDuplicate(e)) throw new ActionError("err.tableExists", { n: input.tableNumber });
    throw e;
  }
}

export async function deleteTable(id: string) {
  await withTransaction(async (tx) => {
    const table = await claimTableById(tx, id);
    if (table.activeOrderId) throw new ActionError("err.tableBusy", { n: table.tableNumber });
    await tx.table.delete({ where: { id } });
  });
}

async function claimTableById(tx: Tx, id: string) {
  try {
    return await tx.table.update({ where: { id }, data: { updatedAt: new Date() } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new ActionError("err.tableMissing");
    throw e;
  }
}

// ---------- Orders on tables ----------

/** Lock the table for this transaction by writing to it first. */
async function claimTable(tx: Tx, number: string) {
  try {
    return await tx.table.update({ where: { tableNumber: number }, data: { updatedAt: new Date() } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new ActionError("err.tableMissing");
    throw e;
  }
}

/** Sent items of a running order, merged by item, size and price. */
function mergeSent(items: { menuItemId: string | null; itemName: string; itemNameHi: string | null; variantName: string | null; category: string; unitPrice: number; quantity: number }[]) {
  const merged = new Map<string, SentLine & { category: string }>();
  for (const it of items) {
    const key = `${it.menuItemId ?? it.itemName}|${it.variantName ?? ""}|${it.unitPrice}`;
    const prev = merged.get(key);
    if (prev) prev.quantity += it.quantity;
    else
      merged.set(key, {
        key: `sent|${key}`,
        menuItemId: it.menuItemId,
        name: it.itemName,
        nameHi: it.itemNameHi,
        variantName: it.variantName,
        category: it.category,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      });
  }
  return [...merged.values()];
}

const sentItemSelect = {
  menuItemId: true,
  itemName: true,
  itemNameHi: true,
  variantName: true,
  category: true,
  unitPrice: true,
  quantity: true,
} satisfies Prisma.TableOrderItemSelect;

export async function getSentLines(number: string): Promise<SentLine[]> {
  const table = await prisma.table.findUnique({ where: { tableNumber: number }, select: { activeOrderId: true } });
  return table?.activeOrderId ? sentLinesOf(table.activeOrderId) : [];
}

async function sentLinesOf(tableOrderId: string): Promise<SentLine[]> {
  const items = await prisma.tableOrderItem.findMany({
    where: { tableOrderId, status: "SENT_TO_KITCHEN" },
    select: sentItemSelect,
    orderBy: { createdAt: "asc" },
  });
  return mergeSent(items).map(({ category: _c, ...l }) => l);
}

/** Record new items on the table's running order (opening one if needed) as a new KOT, queued for the counter to print. */
export async function sendKot(input: z.infer<typeof sendKotSchema>, user: SessionUser) {
  const lines = await priceNewLines(input.items);

  const { kot, orderId } = await withTransaction(async (tx) => {
    const table = await claimTable(tx, input.tableNumber);
    if (!table.isActive) throw new ActionError("err.tableMissing");

    let orderId = table.activeOrderId;
    if (!orderId) {
      const order = await tx.tableOrder.create({ data: { tableId: table.id, staffId: user.id }, select: { id: true } });
      orderId = order.id;
      await tx.table.update({ where: { id: table.id }, data: { activeOrderId: orderId } });
    }

    const counter = await tx.counter.upsert({
      where: { id: "kot" },
      create: { id: "kot", seq: 1 },
      update: { seq: { increment: 1 } },
    });
    const kot = await tx.kOT.create({
      data: { kotNumber: counter.seq, tableOrderId: orderId, printedBy: user.id, staffName: user.name, tableNumber: table.tableNumber, awaitingPrint: true },
      select: { id: true, kotNumber: true, printedAt: true },
    });
    await tx.tableOrderItem.createMany({
      data: lines.map((l) => ({ ...l, tableOrderId: orderId, kotId: kot.id, status: "SENT_TO_KITCHEN" as const })),
    });
    await tx.tableOrder.update({
      where: { id: orderId },
      data: { subtotal: { increment: lines.reduce((s, l) => s + l.lineTotal, 0) } },
    });
    return { kot, orderId };
  });

  const ticket: KotTicketView = {
    kotNumber: kot.kotNumber,
    printedAt: kot.printedAt,
    tableNumber: input.tableNumber,
    staffName: user.name,
    items: lines.map((l) => ({ name: l.itemName, nameHi: l.itemNameHi, variantName: l.variantName, quantity: l.quantity })),
  };
  return { ticket, sent: await sentLinesOf(orderId) };
}

export type CounterKot = KotTicketView & { id: string };

/** KOTs waiting at the counter, oldest first. */
export async function getWaitingKots(): Promise<CounterKot[]> {
  const kots = await prisma.kOT.findMany({
    where: { awaitingPrint: true },
    orderBy: { kotNumber: "asc" },
    take: 100,
    select: {
      id: true,
      kotNumber: true,
      printedAt: true,
      tableNumber: true,
      staffName: true,
      items: { select: { itemName: true, itemNameHi: true, variantName: true, quantity: true }, orderBy: { createdAt: "asc" } },
    },
  });
  return kots.map((k) => ({
    id: k.id,
    kotNumber: k.kotNumber,
    printedAt: k.printedAt,
    tableNumber: k.tableNumber,
    staffName: k.staffName,
    items: k.items.map((i) => ({ name: i.itemName, nameHi: i.itemNameHi, variantName: i.variantName, quantity: i.quantity })),
  }));
}

/** A printed KOT is not kept. Its items stay on the table's running order for the bill. */
export async function deletePrintedKot(id: string): Promise<void> {
  await withTransaction(async (tx) => {
    await tx.tableOrderItem.updateMany({ where: { kotId: id }, data: { kotId: null } });
    await tx.kOT.deleteMany({ where: { id } });
  });
}

/** Turn every KOT on the table into one bill, then free the table. */
export async function settleTable(input: z.infer<typeof settleTableSchema>, maxDiscountPct: number): Promise<Receipt> {
  const customer = customerFields(input);

  const order = await withTransaction(async (tx) => {
    const table = await claimTable(tx, input.tableNumber);
    const running = table.activeOrderId;
    if (!running) throw new ActionError("err.noRunningOrder");

    const items = await tx.tableOrderItem.findMany({
      where: { tableOrderId: running, status: "SENT_TO_KITCHEN" },
      select: sentItemSelect,
      orderBy: { createdAt: "asc" },
    });
    if (items.length === 0) throw new ActionError("err.addItem");

    const lines: LineSnapshot[] = mergeSent(items).map((l) => ({
      menuItemId: l.menuItemId!,
      itemName: l.name,
      itemNameHi: l.nameHi,
      variantName: l.variantName,
      category: l.category,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      lineTotal: l.unitPrice * l.quantity,
    }));

    const receipt = await insertOrder(tx, input, customer, lines, maxDiscountPct);
    await tx.tableOrder.update({
      where: { id: running },
      data: { status: "PAID", subtotal: receipt.subtotal, discountAmount: receipt.discountAmount, total: receipt.total, closedAt: new Date() },
    });
    await tx.table.update({ where: { id: table.id }, data: { activeOrderId: null } });
    return receipt;
  });

  await touchCustomer(customer.customerPhone, customer.customerName, order.createdAt);
  return order;
}
