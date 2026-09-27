import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, History, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { filtersToQuery, orderWhere, parseOrderFilters } from "@/lib/order-filters";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { getT } from "@/lib/i18n/server";
import { StatusBadge } from "@/components/status-badge";
import { formatOrderNumber } from "@/lib/pricing";
import { Empty, METHODS, PageTitle } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("hist.title") };
}

const PAGE_SIZE = 20;

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function HistoryPage({ searchParams }: { searchParams: SP }) {
  const [, t, sp] = await Promise.all([requireUser(), getT(), searchParams]);
  const locale = t.locale;
  const filters = parseOrderFilters(sp);
  const page = Math.max(1, Math.min(10_000, Number(sp.page) || 1));
  const where = orderWhere(filters);

  const customerWhere = filters.phone ? orderWhere({ phone: filters.phone }) : null;
  const [orders, count, customer, latest] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        customerName: true,
        customerPhone: true,
        tableNumber: true,
        total: true,
        balanceDue: true,
        status: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
    customerWhere
      ? prisma.order.aggregate({ where: customerWhere, _count: true, _sum: { total: true, amountPaid: true, balanceDue: true } })
      : null,
    customerWhere
      ? prisma.order.findFirst({
          where: { AND: [customerWhere, { customerName: { not: null } }] },
          orderBy: { createdAt: "desc" },
          select: { customerName: true },
        })
      : null,
  ]);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const exportQuery = filtersToQuery(filters);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <PageTitle title={t("hist.title")} subtitle={t(hasFilters ? "hist.countMatch" : "hist.count", { n: count })} />

      <form method="get" className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        <div className="col-span-2">
          <label htmlFor="q" className="label">{t("hist.q")}</label>
          <input id="q" name="q" defaultValue={filters.q} className="input" placeholder={t("hist.qPh")} />
        </div>
        <div className="col-span-2">
          <label htmlFor="phone" className="label">{t("hist.phone")}</label>
          <input id="phone" name="phone" defaultValue={filters.phone} className="input" inputMode="tel" placeholder={t("hist.phonePh")} />
        </div>
        <div>
          <label htmlFor="from" className="label">{t("hist.from")}</label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className="input" />
        </div>
        <div>
          <label htmlFor="to" className="label">{t("hist.to")}</label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className="input" />
        </div>
        <div>
          <label htmlFor="status" className="label">{t("hist.status")}</label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className="input">
            <option value="">{t("common.any")}</option>
            <option value="PAID">{t("status.PAID")}</option>
            <option value="PARTIAL">{t("status.PARTIAL")}</option>
            <option value="UNPAID">{t("status.UNPAID")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="method" className="label">{t("hist.paidBy")}</label>
          <select id="method" name="method" defaultValue={filters.method ?? ""} className="input">
            <option value="">{t("common.any")}</option>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{t(`method.${m.value}` as const)}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex flex-wrap gap-2 md:col-span-4">
          <button className="btn-primary flex-1 md:flex-none">{t("hist.apply")}</button>
          {hasFilters && <Link href="/history" className="btn-ghost">{t("common.clear")}</Link>}
          <div className="flex w-full gap-2 md:ml-auto md:w-auto">
            <a href={`/api/export/orders${exportQuery}`} className="btn-ghost btn-sm flex-1" download>
              <Download size={16} /> {t("hist.ordersCsv")}
            </a>
            <a href={`/api/export/payments${filtersToQuery({ from: filters.from, to: filters.to, method: filters.method })}`} className="btn-ghost btn-sm flex-1" download>
              <Download size={16} /> {t("hist.paymentsCsv")}
            </a>
          </div>
        </div>
      </form>

      {customer && customer._count > 0 && (
        <section className="card mb-4 flex flex-wrap items-center gap-4 p-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-rani-soft text-rani">
            <UserRound />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-semibold">{latest?.customerName ?? t("hist.customer")}</div>
            <div className="text-sm text-muted">{t("hist.phoneMatching", { p: filters.phone ?? "" })}</div>
          </div>
          <dl className="grid grid-cols-4 gap-3 text-center text-sm">
            <Fig label={t("hist.visits")} value={String(customer._count)} />
            <Fig label={t("hist.billed")} value={formatMoney(customer._sum.total ?? 0)} />
            <Fig label={t("hist.paid")} value={formatMoney(customer._sum.amountPaid ?? 0)} />
            <Fig label={t("hist.due")} value={formatMoney(customer._sum.balanceDue ?? 0)} danger={(customer._sum.balanceDue ?? 0) > 0} />
          </dl>
          {(customer._sum.balanceDue ?? 0) > 0 && (
            <Link href={`/dues?phone=${filters.phone}`} className="btn-accent btn-sm w-full sm:w-auto">
              {t("common.collect")}
            </Link>
          )}
        </section>
      )}

      {orders.length === 0 ? (
        <Empty icon={<History />} title={t("hist.none")}>
          {hasFilters ? t("hist.noneFilters") : t("hist.noneYet")}
        </Empty>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-cream">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display font-semibold">{formatOrderNumber(o.orderNumber)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="truncate text-sm">
                    {o.customerName ?? t("common.walkIn")}
                    {o.customerPhone && <span className="text-muted"> · {o.customerPhone}</span>}
                  </div>
                  <div className="text-xs text-muted">
                    {formatDateTime(o.createdAt, locale)} · {t("hist.lines", { n: o._count.items })}
                    {o.tableNumber && <> · {t("common.table", { n: o.tableNumber })}</>}
                  </div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-semibold">{formatMoney(o.total)}</div>
                  {o.balanceDue > 0 && <div className="text-xs font-semibold text-danger">{t("hist.dueAmt", { amount: formatMoney(o.balanceDue) })}</div>}
                </div>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between gap-3" aria-label={t("hist.pages")}>
          {page > 1 ? (
            <Link href={`/history${filtersToQuery(filters, { page: page - 1 })}`} className="btn-ghost btn-sm">
              <ChevronLeft size={16} /> {t("hist.newer")}
            </Link>
          ) : <span />}
          <span className="text-sm text-muted">{t("hist.page", { p: page, n: pages })}</span>
          {page < pages ? (
            <Link href={`/history${filtersToQuery(filters, { page: page + 1 })}`} className="btn-ghost btn-sm">
              {t("hist.older")} <ChevronRight size={16} />
            </Link>
          ) : <span />}
        </nav>
      )}
    </>
  );
}

function Fig({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`font-semibold tabular-nums ${danger ? "text-danger" : ""}`}>{value}</dd>
    </div>
  );
}
