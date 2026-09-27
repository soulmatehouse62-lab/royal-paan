import type { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { dayRange, isYmd } from "@/lib/time";
import { digitsOnly } from "@/lib/phone";

export type OrderFilters = {
  from?: string;
  to?: string;
  status?: OrderStatus;
  method?: PaymentMethod;
  phone?: string; // digits, partial allowed
  q?: string; // name or order number ("12" / "#0012")
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

const one = (p: Params, k: string) => {
  const v = p instanceof URLSearchParams ? p.get(k) : p[k];
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
};

export function parseOrderFilters(p: Params): OrderFilters {
  const status = one(p, "status");
  const method = one(p, "method");
  const from = one(p, "from");
  const to = one(p, "to");
  const phone = digitsOnly(one(p, "phone")).slice(0, 15);
  return {
    from: isYmd(from) ? from : undefined,
    to: isYmd(to) ? to : undefined,
    status: status === "PAID" || status === "UNPAID" || status === "PARTIAL" ? status : undefined,
    method: method === "CASH" || method === "UPI" || method === "CARD" ? method : undefined,
    phone: phone || undefined,
    q: one(p, "q")?.slice(0, 60),
  };
}

export function orderWhere(f: OrderFilters): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (f.from || f.to) {
    const range = dayRange(f.from ?? "2000-01-01", f.to ?? "2999-12-31");
    and.push({ createdAt: { gte: range.start, lt: range.end } });
  }
  if (f.status) and.push({ status: f.status });
  if (f.method) and.push({ payments: { some: { method: f.method } } });
  if (f.phone) {
    // Phones are stored digits-only, so a partial number is a plain substring.
    and.push(f.phone.length >= 10 ? { phoneKey: f.phone.slice(-10) } : { customerPhone: { contains: f.phone } });
  }
  if (f.q) {
    const n = f.q.replace(/^#/, "");
    const byName: Prisma.OrderWhereInput = { customerName: { contains: f.q, mode: "insensitive" } };
    and.push(/^\d{1,9}$/.test(n) ? { OR: [{ orderNumber: Number(n) }, byName] } : byName);
  }
  return and.length ? { AND: and } : {};
}

/** Filters back to a query string (for pagination and export links). */
export function filtersToQuery(f: OrderFilters, extra: Record<string, string | number | undefined> = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
