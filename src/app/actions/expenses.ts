"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { run } from "@/lib/action";
import { ActionError, isObjectId } from "@/lib/db";
import { createExpense, deleteExpense, expenseSchema, updateExpense } from "@/lib/expenses";

function checkId(id: unknown): string {
  if (!isObjectId(id)) throw new ActionError("err.expenseMissing");
  return id;
}

export async function createExpenseAction(input: unknown) {
  return run(async () => {
    const user = await requireAdmin();
    await createExpense(expenseSchema.parse(input), user);
    revalidatePath("/kirana");
    return null;
  });
}

export async function updateExpenseAction(id: string, input: unknown) {
  return run(async () => {
    await requireAdmin();
    await updateExpense(checkId(id), expenseSchema.parse(input));
    revalidatePath("/kirana");
    return null;
  });
}

export async function deleteExpenseAction(id: string) {
  return run(async () => {
    await requireAdmin();
    await deleteExpense(checkId(id));
    revalidatePath("/kirana");
    return null;
  });
}
