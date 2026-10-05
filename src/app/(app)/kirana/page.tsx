import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireAdminPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { startOfDay, toYmd } from "@/lib/time";
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

  const [expenses, staff] = await Promise.all([
    prisma.expense.findMany({
      where: { spentOn: { gte: start, lt: end } },
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
      select: { id: true, category: true, amount: true, note: true, method: true, spentOn: true, staffId: true, staffName: true },
    }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = (c: string) => expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);

  // Advance per staff member this month.
  const advances = new Map<string, { name: string; amount: number }>();
  for (const e of expenses) {
    if (e.category !== "STAFF_ADVANCE" || !e.staffId) continue;
    const cur = advances.get(e.staffId) ?? { name: e.staffName ?? "", amount: 0 };
    cur.amount += e.amount;
    advances.set(e.staffId, cur);
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

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t("kirana.total")} value={formatMoney(total)} tone="danger" />
        <Stat label={t("kirana.cat.RATION")} value={formatMoney(byCat("RATION"))} tone="leaf" />
        <Stat label={t("kirana.cat.GAS")} value={formatMoney(byCat("GAS"))} tone="gold" />
        <Stat label={t("kirana.cat.STAFF_ADVANCE")} value={formatMoney(byCat("STAFF_ADVANCE"))} tone="rani" />
      </div>

      {advances.size > 0 && (
        <section className="card mb-4 p-4">
          <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted">{t("kirana.advanceByStaff")}</h2>
          <ul className="divide-y divide-line">
            {[...advances]
              .sort(([, a], [, b]) => b.amount - a.amount)
              .map(([id, a]) => (
                <li key={id} className="flex justify-between py-1.5 text-[15px]">
                  <span>{a.name}</span>
                  <span className="font-semibold tabular-nums">{formatMoney(a.amount)}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <KiranaManager
        today={today}
        staff={staff}
        expenses={expenses.map((e) => ({ ...e, spentOn: toYmd(e.spentOn) }))}
      />
    </div>
  );
}
