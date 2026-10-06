import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { startOfDay, toYmd } from "@/lib/time";
import { recentStaffNames } from "@/lib/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import { getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n";
import { PageTitle, Stat } from "@/components/ui";
import { KiranaManager } from "./kirana-manager";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("kirana.title") };
}

type SP = Promise<Record<string, string | string[] | undefined>>;

/** "2026-10" → "2026-11" (delta = 1) */
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function KiranaPage({ searchParams }: { searchParams: SP }) {
  const [, t, sp] = await Promise.all([requireAdminPage(), getT(), searchParams]);
  const today = toYmd();
  const thisMonth = today.slice(0, 7);
  const raw = typeof sp.month === "string" ? sp.month : "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) && raw <= thisMonth ? raw : thisMonth;
  const start = startOfDay(`${month}-01`);
  const end = startOfDay(`${shiftMonth(month, 1)}-01`);

  const [expenses, staffNames] = await Promise.all([
    prisma.expense.findMany({
      where: { spentOn: { gte: start, lt: end } },
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
      select: { id: true, category: true, amount: true, items: true, note: true, method: true, spentOn: true, staffName: true },
    }),
    recentStaffNames(),
  ]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    category: c,
    amount: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).filter((r) => r.amount > 0);

  // What each staff member got this month (advance and salary), keyed by name.
  const staffPaid = new Map<string, { name: string; advance: number; salary: number }>();
  for (const e of expenses) {
    if (!e.staffName || (e.category !== "STAFF_ADVANCE" && e.category !== "SALARY")) continue;
    const key = e.staffName.toLowerCase();
    const cur = staffPaid.get(key) ?? { name: e.staffName, advance: 0, salary: 0 };
    if (e.category === "STAFF_ADVANCE") cur.advance += e.amount;
    else cur.salary += e.amount;
    staffPaid.set(key, cur);
  }

  const monthLabel = new Intl.DateTimeFormat(intlLocale(t.locale), { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("kirana.title")} subtitle={t("kirana.hint")} />

      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/kirana?month=${shiftMonth(month, -1)}`} className="btn-ghost btn-sm" aria-label={t("kirana.prevMonth")}>
          <ChevronLeft size={18} />
        </Link>
        <span className="font-semibold">{monthLabel}</span>
        {month < thisMonth ? (
          <Link href={`/kirana?month=${shiftMonth(month, 1)}`} className="btn-ghost btn-sm" aria-label={t("kirana.nextMonth")}>
            <ChevronRight size={18} />
          </Link>
        ) : (
          <span className="w-10" />
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <Stat label={t("kirana.total")} value={formatMoney(total)} tone="danger" />
        {byCategory.length > 0 && (
          <ul className="card grid grid-cols-2 gap-x-4 gap-y-1 p-3 text-sm">
            {byCategory.map((r) => (
              <li key={r.category} className="flex justify-between gap-2">
                <span className="truncate text-muted">{t(`kirana.cat.${r.category}`)}</span>
                <span className="font-semibold tabular-nums">{formatMoney(r.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {staffPaid.size > 0 && (
        <section className="card mb-4 p-4">
          <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted">{t("kirana.staffThisMonth")}</h2>
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-1 font-semibold">{t("kirana.staff")}</th>
                <th className="pb-1 text-right font-semibold">{t("kirana.cat.STAFF_ADVANCE")}</th>
                <th className="pb-1 text-right font-semibold">{t("kirana.cat.SALARY")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...staffPaid]
                .sort(([, a], [, b]) => b.advance + b.salary - (a.advance + a.salary))
                .map(([key, s]) => (
                  <tr key={key}>
                    <td className="py-1.5">{s.name}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{s.advance ? formatMoney(s.advance) : "–"}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{s.salary ? formatMoney(s.salary) : "–"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      <KiranaManager today={today} staffNames={staffNames} expenses={expenses.map((e) => ({ ...e, items: e.items ?? [], spentOn: toYmd(e.spentOn) }))} />
    </div>
  );
}
