import "server-only";
import { z } from "zod";
import { ActionError, prisma } from "@/lib/db";
import { parseRupees } from "@/lib/money";
import { addDays, isYmd, startOfDay, toYmd } from "@/lib/time";
import type { SessionUser } from "@/lib/auth/session";
import { EXPENSE_CATEGORIES, ITEM_UNITS, needsStaff } from "@/lib/expense-categories";

const rupees = (msg: "err.amountPositive" | "err.itemAmount") =>
  z
    .union([z.string(), z.number()])
    .transform((v) => parseRupees(v))
    .refine((v): v is number => v !== null && v > 0, msg);

const itemSchema = z.object({
  name: z.string().trim().min(1, "err.itemName").max(60, "err.itemName"),
  qty: z.number().positive("err.itemQty").max(100_000, "err.itemQty").nullable().optional(),
  unit: z.enum(ITEM_UNITS).nullable().optional(),
  amount: rupees("err.itemAmount"),
});

export const expenseSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORIES),
    /// Ignored when items are given: the total is their sum.
    amount: z.union([z.string(), z.number()]).nullable().optional(),
    items: z.array(itemSchema).max(50, "err.tooManyItems").default([]),
    note: z.string().trim().max(120).nullable().optional(),
    method: z.enum(["CASH", "UPI", "CARD"]),
    spentOn: z.string().refine(isYmd, "err.checkForm"),
    staffName: z.string().trim().max(40).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (needsStaff(v.category) && !v.staffName) {
      ctx.addIssue({ code: "custom", path: ["staffName"], message: "err.staffName" });
    }
    if (v.items.length === 0) {
      const p = parseRupees(v.amount);
      if (p === null || p <= 0) ctx.addIssue({ code: "custom", path: ["amount"], message: "err.amountPositive" });
    }
    if (v.spentOn > addDays(toYmd(), 1)) {
      ctx.addIssue({ code: "custom", path: ["spentOn"], message: "err.futureDate" });
    }
  });
export type ExpenseInput = z.infer<typeof expenseSchema>;

function toData(input: ExpenseInput) {
  const items = input.items.map((it) => ({ name: it.name, qty: it.qty ?? null, unit: it.qty ? (it.unit ?? null) : null, amount: it.amount }));
  const amount = items.length ? items.reduce((s, it) => s + it.amount, 0) : parseRupees(input.amount)!;
  if (amount > 1_000_000_000) throw new ActionError("err.priceHigh");
  return {
    category: input.category,
    amount,
    items,
    note: input.note || null,
    method: input.method,
    spentOn: startOfDay(input.spentOn),
    staffName: needsStaff(input.category) ? input.staffName! : null,
    staffId: null,
  };
}

export async function createExpense(input: ExpenseInput, by: SessionUser) {
  await prisma.expense.create({ data: { ...toData(input), createdById: by.id, createdByName: by.name } });
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const { count } = await prisma.expense.updateMany({ where: { id }, data: toData(input) });
  if (count === 0) throw new ActionError("err.expenseMissing");
}

export async function deleteExpense(id: string) {
  await prisma.expense.deleteMany({ where: { id } });
}

/** Names typed before, newest first, to suggest in the staff field. */
export async function recentStaffNames(): Promise<string[]> {
  const rows = await prisma.expense.findMany({
    where: { staffName: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { staffName: true },
  });
  const seen = new Map<string, string>();
  for (const r of rows) {
    const key = r.staffName!.toLowerCase();
    if (!seen.has(key)) seen.set(key, r.staffName!);
  }
  return [...seen.values()];
}
