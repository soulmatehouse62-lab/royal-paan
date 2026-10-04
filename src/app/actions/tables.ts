"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { run } from "@/lib/action";
import { ActionError, isObjectId } from "@/lib/db";
import { maxDiscountPct } from "@/lib/pricing";
import {
  createTable,
  deleteTable,
  getSentLines,
  deletePrintedKot,
  sendKot,
  sendKotSchema,
  settleTable,
  settleTableSchema,
  tableSchema,
  updateTable,
} from "@/lib/table-orders";

const refreshAll = () => revalidatePath("/", "layout");

function checkId(id: unknown): string {
  if (!isObjectId(id)) throw new ActionError("err.tableMissing");
  return id;
}

export async function getSentLinesAction(tableNumber: string) {
  return run(async () => {
    await requireUser();
    return getSentLines(String(tableNumber));
  });
}

export async function sendKotAction(input: unknown) {
  return run(async () => {
    const user = await requireUser();
    const res = await sendKot(sendKotSchema.parse(input), user);
    refreshAll();
    return res;
  });
}

export async function deletePrintedKotAction(id: string) {
  return run(async () => {
    await requireUser();
    if (!isObjectId(id)) throw new ActionError("err.generic");
    await deletePrintedKot(id);
    revalidatePath("/kots");
    return null;
  });
}

export async function settleTableAction(input: unknown) {
  return run(async () => {
    const user = await requireUser();
    const receipt = await settleTable(settleTableSchema.parse(input), maxDiscountPct(user.role));
    refreshAll();
    return receipt;
  });
}

export async function createTableAction(input: unknown) {
  return run(async () => {
    await requireAdmin();
    await createTable(tableSchema.parse(input));
    refreshAll();
    return null;
  });
}

export async function updateTableAction(id: string, input: unknown) {
  return run(async () => {
    await requireAdmin();
    await updateTable(checkId(id), tableSchema.parse(input));
    refreshAll();
    return null;
  });
}

export async function deleteTableAction(id: string) {
  return run(async () => {
    await requireAdmin();
    await deleteTable(checkId(id));
    refreshAll();
    return null;
  });
}
