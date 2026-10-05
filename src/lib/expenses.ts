import "server-only";
import { z } from "zod";
import { ActionError, isObjectId, prisma } from "@/lib/db";
import { parseRupees } from "@/lib/money";
import { addDays, isYmd, startOfDay, toYmd } from "@/lib/time";
import type { SessionUser } from "@/lib/auth/session";

export const EXPENSE_CATEGORIES = ["RATION", "GAS", "STAFF_ADVANCE", "OTHER"] as const;

export const expenseSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORIES),
    amount: z
      .union([z.string(), z.number()])
      .transform((v) => parseRupees(v))
      .refine((v): v is number => v !== null && v > 0, "err.amountPositive"),
    note: z.string().trim().max(120).nullable().optional(),
    method: z.enum(["CASH", "UPI", "CARD"]),
    spentOn: z.string().refine(isYmd, "err.checkForm"),
    staffId: z.string().nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.category === "STAFF_ADVANCE" && !isObjectId(v.staffId)) {
      ctx.addIssue({ code: "custom", path: ["staffId"], message: "err.pickStaff" });
    }
    if (v.spentOn > addDays(toYmd(), 1)) {
      ctx.addIssue({ code: "custom", path: ["spentOn"], message: "err.futureDate" });
    }
  });
export type ExpenseInput = z.infer<typeof expenseSchema>;

async function toData(input: ExpenseInput) {
  let staffId: string | null = null;
  let staffName: string | null = null;
  if (input.category === "STAFF_ADVANCE") {
    const staff = await prisma.user.findUnique({ where: { id: input.staffId! }, select: { id: true, name: true } });
    if (!staff) throw new ActionError("err.pickStaff");
    staffId = staff.id;
    staffName = staff.name;
  }
  return {
    category: input.category,
    amount: input.amount,
    note: input.note || null,
    method: input.method,
    spentOn: startOfDay(input.spentOn),
    staffId,
    staffName,
  };
}

export async function createExpense(input: ExpenseInput, by: SessionUser) {
  await prisma.expense.create({ data: { ...(await toData(input)), createdById: by.id, createdByName: by.name } });
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const { count } = await prisma.expense.updateMany({ where: { id }, data: await toData(input) });
  if (count === 0) throw new ActionError("err.expenseMissing");
}

export async function deleteExpense(id: string) {
  await prisma.expense.deleteMany({ where: { id } });
}
