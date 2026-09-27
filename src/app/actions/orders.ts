"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { run } from "@/lib/action";
import { isObjectId, ActionError } from "@/lib/db";
import {
  addPayment,
  collectForCustomer,
  createOrder,
  createOrderSchema,
  deleteOrder,
  methodSchema,
  removePayment,
  updateOrder,
  updateOrderSchema,
} from "@/lib/orders";

const refreshAll = () => revalidatePath("/", "layout");

function checkId(id: unknown): string {
  if (!isObjectId(id)) throw new ActionError("err.orderMissing");
  return id;
}

export async function createOrderAction(input: unknown) {
  return run(async () => {
    await requireUser();
    const receipt = await createOrder(createOrderSchema.parse(input));
    refreshAll();
    return receipt;
  });
}

export async function updateOrderAction(input: unknown) {
  return run(async () => {
    await requireUser();
    const data = updateOrderSchema.parse(input);
    await updateOrder(data);
    refreshAll();
    return data.orderId;
  });
}

const paymentInput = z.object({ amount: z.number().int().positive("err.amountPositive"), method: methodSchema });

export async function addPaymentAction(orderId: string, amount: number, method: string) {
  return run(async () => {
    await requireUser();
    const p = paymentInput.parse({ amount, method });
    const res = await addPayment(checkId(orderId), p.amount, p.method);
    refreshAll();
    return res;
  });
}

export async function collectForCustomerAction(key: string, amount: number, method: string) {
  return run(async () => {
    await requireUser();
    const p = paymentInput.parse({ amount, method });
    const res = await collectForCustomer(String(key), p.amount, p.method);
    refreshAll();
    return res;
  });
}

export async function removePaymentAction(orderId: string, paymentId: string) {
  return run(async () => {
    await requireAdmin();
    await removePayment(checkId(orderId), checkId(paymentId));
    refreshAll();
    return null;
  });
}

export async function deleteOrderAction(orderId: string) {
  const res = await run(async () => {
    await requireAdmin();
    await deleteOrder(checkId(orderId));
    refreshAll();
    return null;
  });
  if (res.ok) redirect("/history");
  return res;
}
