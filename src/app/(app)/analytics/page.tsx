import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { itemNames } from "@/lib/i18n";
import { categoryLabel, sizeName } from "@/lib/categories";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/session";
import { defaultCustomRange, getAnalytics, resolvePeriod, MAX_RANGE_DAYS } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { formatAge, formatYmdShort } from "@/lib/time";
import { categoryStyle } from "@/lib/categories";
import type { Locale } from "@/lib/i18n";
import { PageTitle, Stat } from "@/components/ui";
import { Charts } from "./charts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("an.title") };
}

const PERIODS = [
  { value: "today", label: "an.today" },
  { value: "week", label: "an.week" },
  { value: "month", label: "an.month" },
  { value: "custom", label: "an.custom" },
] as const;

/** "Masala Chai · Large" in the viewer's language. */
function itemLabel(r: { name: string; nameHi: string | null; size: string | null }, locale: Locale) {
  const name = itemNames(r, locale).primary;
  return r.size ? `${name} · ${sizeName(r.size, locale)}` : name;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [, t, sp] = await Promise.all([requireAdminPage(), getT(), searchParams]);
  const locale = t.locale;
  const { period, from, to, error } = resolvePeriod(sp);
  const data = await getAnalytics(from, to);
  const custom = period === "custom" && !error ? { from, to } : defaultCustomRange();
  const rangeLabel = from === to ? formatYmdShort(from, locale) : `${formatYmdShort(from, locale)} – ${formatYmdShort(to, locale)}`;

  return (
    <>
      <PageTitle title={t("an.title")} subtitle={rangeLabel} />

      <div className="mb-4 space-y-3">
        <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" aria-label={t("an.period")}>
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={p.value === "custom" ? `/analytics?period=custom&from=${custom.from}&to=${custom.to}` : `/analytics?period=${p.value}`}
              aria-current={period === p.value ? "page" : undefined}
              className={`chip ${period === p.value ? "border-leaf bg-leaf text-white" : "border-line bg-white text-muted hover:text-ink"}`}
            >
              {t(p.label)}
            </Link>
          ))}
        </nav>
        {period === "custom" && (
          <form method="get" className="card flex flex-wrap items-end gap-3 p-3">
            <input type="hidden" name="period" value="custom" />
            <div className="flex-1">
              <label htmlFor="from" className="label">{t("an.from")}</label>
              <input id="from" name="from" type="date" defaultValue={custom.from} className="input" required />
            </div>
            <div className="flex-1">
              <label htmlFor="to" className="label">{t("an.to")}</label>
              <input id="to" name="to" type="date" defaultValue={custom.to} className="input" required />
            </div>
            <button className="btn-primary">{t("an.show")}</button>
            <p className="w-full text-xs text-muted">{t("an.maxDays", { n: MAX_RANGE_DAYS })}</p>
          </form>
        )}
        {error && <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{t(error, { n: MAX_RANGE_DAYS })} {t("an.showingToday")}</p>}
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={t("an.summary")}>
        <Stat label={t("an.collected")} value={formatMoney(data.collected)} hint={t("an.collectedHint")} />
        <Stat label={t("an.outstanding")} value={formatMoney(data.outstanding)} tone="rani" hint={t("an.outstandingHint")} />
        <Stat label={t("an.orders")} value={String(data.orders)} tone="gold" />
        <Stat label={t("an.avg")} value={formatMoney(data.avgOrder)} tone="gold" />
      </section>

      <Charts daily={data.daily} methods={data.methods} categories={data.categories.map((c) => ({ ...c, label: categoryLabel(c.category, locale) }))} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Ranked title={t("an.topQty")} empty={t("an.noSales")} rows={data.topByQty.map((r) => ({ label: itemLabel(r, locale), value: r.qty, text: t("an.sold", { n: r.qty }) }))} />
        <Ranked title={t("an.topRev")} empty={t("an.noSales")} rows={data.topByRevenue.map((r) => ({ label: itemLabel(r, locale), value: r.revenue, text: formatMoney(r.revenue) }))} />
      </div>
      <p className="mt-2 text-xs text-muted">{t("an.beforeDiscount")}</p>

      <section className="card mt-5 p-4">
        <h2 className="mb-1 text-lg font-semibold">{t("an.owesMost")}</h2>
        <p className="mb-3 text-xs text-muted">{t("an.allTime")}</p>
        {data.debtors.length === 0 ? (
          <p className="text-sm text-muted">{t("an.nobody")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.debtors.map((d, i) => (
              <li key={d.key} className="flex items-center gap-3 py-2.5">
                <span className="w-5 text-sm font-semibold text-muted tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{d.name ?? t("common.walkIn")}</div>
                  <div className="text-xs text-muted">
                    {t("an.debtorLine", { phone: d.phone ?? t("common.noPhone"), n: d.bills, age: formatAge(d.oldest, t) })}
                  </div>
                </div>
                <span className="font-semibold text-danger tabular-nums">{formatMoney(d.due)}</span>
                {d.phoneKey && (
                  <Link href={`/dues?phone=${d.phoneKey}`} className="btn-ghost btn-sm">{t("common.collect")}</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.categories.length > 0 && (
        <section className="card mt-5 overflow-x-auto p-4">
          <h2 className="mb-3 text-lg font-semibold">{t("an.catTable")}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 font-semibold">{t("an.category")}</th>
                <th className="pb-2 text-right font-semibold">{t("an.qty")}</th>
                <th className="pb-2 text-right font-semibold">{t("an.sales")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.categories.map((c) => {
                const s = categoryStyle(c.category);
                return (
                  <tr key={c.category}>
                    <td className="py-2">
                      <span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: s.color }} />
                      {categoryLabel(c.category, locale)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{c.qty}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(c.revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

/** A ranked list with thin inline bars: easier to read on a phone than a chart. */
function Ranked({ title, empty, rows }: { title: string; empty: string; rows: { label: string; value: number; text: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={r.label}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">
                  <span className="mr-1.5 text-muted tabular-nums">{i + 1}.</span>
                  {r.label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{r.text}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-cream-deep">
                <div className="h-full rounded-full bg-[#2f7d4a]" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
