import "server-only";
import { prisma, num, dateArg, ejsonDate } from "@/lib/db";
import { TIME_ZONE, addDays, dayRange, daysBetween, eachDay, isYmd, startOfMonth, startOfWeek, toYmd } from "@/lib/time";

export type Period = "today" | "week" | "month" | "custom";
export const MAX_RANGE_DAYS = 366;

export function resolvePeriod(sp: Record<string, string | string[] | undefined>) {
  const pick = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const today = toYmd();
  let period = (pick("period") as Period) || "today";
  let from = today;
  let to = today;
  let error: "an.errPick" | "an.errOrder" | "an.errRange" | null = null;

  if (period === "week") from = startOfWeek(today);
  else if (period === "month") from = startOfMonth(today);
  else if (period === "custom") {
    const f = pick("from");
    const t = pick("to");
    if (!isYmd(f) || !isYmd(t)) error = "an.errPick";
    else if (f > t) error = "an.errOrder";
    else if (daysBetween(f, t) + 1 > MAX_RANGE_DAYS) error = "an.errRange";
    else [from, to] = [f, t];
    if (error) from = to = today;
  } else period = "today";

  return { period, from, to, error };
}

type Row = Record<string, unknown>;

export async function getAnalytics(from: string, to: string) {
  const { start, end } = dayRange(from, to);
  const range = { $gte: dateArg(start), $lt: dateArg(end) };
  const day = (field: string) => ({ $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone: TIME_ZONE } });

  const [payRaw, orderRaw, itemRaw, debtRaw, expenseRows] = await Promise.all([
    // Revenue collected = payments received in the period (whenever the order was placed).
    prisma.payment.aggregateRaw({
      pipeline: [
        { $match: { paidAt: range } },
        {
          $facet: {
            total: [{ $group: { _id: null, sum: { $sum: "$amount" } } }],
            byDay: [{ $group: { _id: day("paidAt"), sum: { $sum: "$amount" } } }],
            byMethod: [{ $group: { _id: "$method", sum: { $sum: "$amount" }, n: { $sum: 1 } } }],
          },
        },
      ],
    }),
    prisma.order.aggregateRaw({
      pipeline: [
        { $match: { createdAt: range } },
        {
          $facet: {
            total: [{ $group: { _id: null, n: { $sum: 1 }, billed: { $sum: "$total" }, outstanding: { $sum: "$balanceDue" } } }],
            byDay: [{ $group: { _id: day("createdAt"), outstanding: { $sum: "$balanceDue" }, n: { $sum: 1 } } }],
          },
        },
      ],
    }),
    // Top items and category sales use line totals before discount.
    prisma.order.aggregateRaw({
      pipeline: [
        { $match: { createdAt: range } },
        { $project: { _id: 1 } },
        { $lookup: { from: "order_items", localField: "_id", foreignField: "orderId", as: "it" } },
        { $unwind: "$it" },
        { $replaceRoot: { newRoot: "$it" } },
        {
          $facet: {
            byItem: [{ $group: { _id: { name: "$itemName", size: "$variantName" }, nameHi: { $last: "$itemNameHi" }, qty: { $sum: "$quantity" }, revenue: { $sum: "$lineTotal" } } }],
            byCategory: [{ $group: { _id: "$category", qty: { $sum: "$quantity" }, revenue: { $sum: "$lineTotal" } } }, { $sort: { revenue: -1 } }],
          },
        },
      ],
    }),
    // Who owes the most, across all time.
    prisma.order.aggregateRaw({
      pipeline: [
        { $match: { balanceDue: { $gt: 0 } } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: { $ifNull: ["$phoneKey", { $concat: ["name:", { $toLower: { $ifNull: ["$customerName", "walk-in"] } }] }] },
            due: { $sum: "$balanceDue" },
            bills: { $sum: 1 },
            name: { $last: "$customerName" },
            phone: { $last: "$customerPhone" },
            phoneKey: { $last: "$phoneKey" },
            oldest: { $first: "$createdAt" },
          },
        },
        { $sort: { due: -1 } },
        { $limit: 10 },
      ],
    }),
    // Kirana expenses; spentOn is local midnight, so the day range matches exactly.
    prisma.expense.groupBy({ by: ["category"], where: { spentOn: { gte: start, lt: end } }, _sum: { amount: true } }),
  ]);

  const pay = (payRaw as unknown as Row[])[0] as { total: Row[]; byDay: Row[]; byMethod: Row[] };
  const ord = (orderRaw as unknown as Row[])[0] as { total: Row[]; byDay: Row[] };
  const items = (itemRaw as unknown as Row[])[0] as { byItem: Row[]; byCategory: Row[] } | undefined;

  const collected = num(pay.total[0]?.sum);
  const orders = num(ord.total[0]?.n);
  const billed = num(ord.total[0]?.billed);
  const outstanding = num(ord.total[0]?.outstanding);

  const payByDay = new Map(pay.byDay.map((r) => [String(r._id), num(r.sum)]));
  const ordByDay = new Map(ord.byDay.map((r) => [String(r._id), r]));
  const daily = eachDay(from, to).map((d) => ({
    day: d,
    collected: payByDay.get(d) ?? 0,
    outstanding: num(ordByDay.get(d)?.outstanding),
    orders: num(ordByDay.get(d)?.n),
  }));

  const methods = (["CASH", "UPI", "CARD"] as const).map((m) => {
    const r = pay.byMethod.find((x) => x._id === m);
    return { method: m, amount: num(r?.sum), count: num(r?.n) };
  });

  const byItem = (items?.byItem ?? []).map((r) => {
    const id = r._id as { name: string; size?: string | null };
    const nameHi = (r.nameHi as string | null | undefined) ?? null;
    return { name: id.name, nameHi, size: id.size ?? null, qty: num(r.qty), revenue: num(r.revenue) };
  });
  const topByQty = [...byItem].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 10);
  const topByRevenue = [...byItem].sort((a, b) => b.revenue - a.revenue || b.qty - a.qty).slice(0, 10);
  const categories = (items?.byCategory ?? []).map((r) => ({ category: String(r._id), qty: num(r.qty), revenue: num(r.revenue) }));

  const debtors = (debtRaw as unknown as Row[]).map((r) => ({
    key: String(r._id),
    name: (r.name as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    phoneKey: (r.phoneKey as string | null) ?? null,
    due: num(r.due),
    bills: num(r.bills),
    oldest: ejsonDate(r.oldest).toISOString(),
  }));

  const expenseByCategory = expenseRows
    .map((r) => ({ category: r.category, amount: r._sum.amount ?? 0 }))
    .sort((a, b) => b.amount - a.amount);
  const expenses = expenseByCategory.reduce((s, r) => s + r.amount, 0);

  return {
    collected,
    expenses,
    expenseByCategory,
    profit: collected - expenses,
    outstanding,
    orders,
    avgOrder: orders ? Math.round(billed / orders) : 0,
    daily,
    methods,
    topByQty,
    topByRevenue,
    categories,
    debtors,
  };
}

export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;

export const defaultCustomRange = () => {
  const today = toYmd();
  return { from: addDays(today, -29), to: today };
};
