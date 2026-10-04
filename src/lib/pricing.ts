// Pure pricing rules shared by the server (authoritative) and the client (preview).
import type { DiscountType, OrderStatus, Role } from "@prisma/client";

export type DiscountInput = { type: DiscountType; value: number } | null | undefined;

/** Discount in paise, clamped so the total never goes below 0. */
export function discountAmount(subtotal: number, discount: DiscountInput): number {
  if (!discount || !(discount.value > 0)) return 0;
  const raw =
    discount.type === "PERCENT"
      ? Math.round((subtotal * Math.min(discount.value, 100)) / 100)
      : Math.round(discount.value * 100);
  return Math.max(0, Math.min(raw, subtotal));
}

/** Highest discount, as % of the subtotal, a user may give: staff are capped, admins are not. */
export const STAFF_MAX_DISCOUNT_PCT = 15;
export const maxDiscountPct = (role: Role) => (role === "STAFF" ? STAFF_MAX_DISCOUNT_PCT : 100);

/** True when the discount goes over maxPct % of the subtotal. */
export function discountOverLimit(subtotal: number, amount: number, maxPct: number): boolean {
  return maxPct < 100 && amount > Math.round((subtotal * maxPct) / 100);
}

/** Paid in full → PAID; paid something → PARTIAL; paid nothing → UNPAID. */
export function statusFor(total: number, paid: number): OrderStatus {
  if (paid >= total) return "PAID";
  return paid > 0 ? "PARTIAL" : "UNPAID";
}

export function totalsFromPayments(total: number, paid: number) {
  return { amountPaid: paid, balanceDue: Math.max(0, total - paid), status: statusFor(total, paid) };
}

/** Split one amount across bills, oldest first. */
export function allocateOldestFirst<T extends { balanceDue: number }>(bills: T[], amount: number) {
  let left = amount;
  return bills.map((bill) => {
    const apply = Math.max(0, Math.min(left, bill.balanceDue));
    left -= apply;
    return { bill, apply, remaining: bill.balanceDue - apply };
  });
}

/** Short label for a size button: "Medium" → "M", "Large" → "L", "Half" → "H". */
export function sizeLabel(name: string, all: string[]): string {
  const initial = name.trim().charAt(0).toUpperCase();
  const clash = all.filter((n) => n.trim().charAt(0).toUpperCase() === initial).length > 1;
  return name.length <= 3 || clash ? name : initial;
}

export const formatOrderNumber = (n: number) => `#${String(n).padStart(4, "0")}`;
