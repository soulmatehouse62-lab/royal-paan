import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getMenu } from "@/lib/menu-data";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { maxDiscountPct } from "@/lib/pricing";
import { dayRange, greetingKey, toYmd } from "@/lib/time";
import { getT } from "@/lib/i18n/server";
import { NewOrderFlow } from "@/components/order/new-order-flow";
import type { PickerTable } from "@/components/order/table-picker";
import { Empty } from "@/components/ui";
import { BookOpen } from "lucide-react";

export default async function NewOrderPage() {
  const [user, t, all, tables] = await Promise.all([
    requireUser(),
    getT(),
    getMenu(),
    getPickerTables(),
  ]);
  const menu = all.filter((m) => m.isAvailable);
  const labels = { greeting: t(greetingKey()), collected: t("home.collectedToday"), orders: t("home.ordersToday"), dues: t("home.openDues") };

  return (
    <>
      <Suspense fallback={<StripSkeleton name={user.name} labels={labels} />}>
        <GreetingStrip name={user.name} labels={labels} />
      </Suspense>
      {menu.length === 0 ? (
        <Empty icon={<BookOpen />} title={t("home.emptyMenu")}>
          {t("home.emptyMenuHint")}
          <Link href="/menu" className="btn-primary btn-sm mt-3">{t("home.openMenu")}</Link>
        </Empty>
      ) : (
        <NewOrderFlow menu={menu} tables={tables} maxDiscountPct={maxDiscountPct(user.role)} />
      )}
    </>
  );
}

async function getPickerTables(): Promise<PickerTable[]> {
  // Both in parallel: running orders are matched to tables by activeOrderId below.
  const [tables, running] = await Promise.all([
    prisma.table.findMany({
      where: { isActive: true },
      select: { id: true, tableNumber: true, name: true, capacity: true, area: true, activeOrderId: true },
    }),
    prisma.tableOrder.findMany({
      where: { status: "RUNNING" },
      select: { id: true, subtotal: true, createdAt: true, staff: { select: { name: true } } },
    }),
  ]);
  const byId = new Map(running.map((r) => [r.id, { subtotal: r.subtotal, since: r.createdAt, staffName: r.staff.name }]));
  return tables
    .map(({ activeOrderId, ...tb }) => ({ ...tb, running: (activeOrderId && byId.get(activeOrderId)) || null }))
    .sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }));
}

type Labels = { greeting: string; collected: string; orders: string; dues: string };

async function GreetingStrip({ name, labels }: { name: string; labels: Labels }) {
  const today = toYmd();
  const { start, end } = dayRange(today, today);
  const [collected, orders, dues] = await Promise.all([
    prisma.payment.aggregate({ where: { paidAt: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.order.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.order.aggregate({ where: { balanceDue: { gt: 0 } }, _sum: { balanceDue: true } }),
  ]);
  return (
    <Strip
      name={name}
      labels={labels}
      collected={formatMoney(collected._sum.amount ?? 0)}
      orders={String(orders)}
      dues={formatMoney(dues._sum.balanceDue ?? 0)}
    />
  );
}

function Strip({ name, labels, collected, orders, dues }: { name: string; labels: Labels; collected: React.ReactNode; orders: React.ReactNode; dues: React.ReactNode }) {
  return (
    <section className="mb-5 overflow-hidden rounded-card bg-leaf text-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-[radial-gradient(circle_at_100%_0%,rgb(26_21_16/0.6),transparent_55%)] px-5 py-4">
        <div>
          <p className="text-sm text-white/75">{labels.greeting},</p>
          <p className="font-display text-2xl font-semibold leading-tight">{name.split(" ")[0]}</p>
        </div>
        <dl className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-96 sm:flex-1 sm:max-w-md">
          <Figure label={labels.collected} value={collected} />
          <Figure label={labels.orders} value={orders} />
          <Link href="/dues" className="min-w-0 rounded-xl bg-white/10 px-2.5 py-2 sm:px-3 transition hover:bg-white/20">
            <dt className="text-[10px] font-medium uppercase leading-tight tracking-wide text-white/70 sm:text-[11px]">{labels.dues}</dt>
            <dd className="truncate font-display text-base font-semibold tabular-nums sm:text-lg">{dues}</dd>
          </Link>
        </dl>
      </div>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/10 px-2.5 py-2 sm:px-3">
      <dt className="text-[10px] font-medium uppercase leading-tight tracking-wide text-white/70 sm:text-[11px]">{label}</dt>
      <dd className="truncate font-display text-base font-semibold tabular-nums sm:text-lg">{value}</dd>
    </div>
  );
}

function StripSkeleton({ name, labels }: { name: string; labels: Labels }) {
  const bar = <span className="inline-block h-6 w-14 animate-pulse rounded bg-white/20" />;
  return <Strip name={name} labels={labels} collected={bar} orders={bar} dues={bar} />;
}
