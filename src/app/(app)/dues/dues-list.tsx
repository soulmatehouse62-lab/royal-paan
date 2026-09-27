"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Clock, HandCoins, LoaderCircle, Phone, Search, X } from "lucide-react";
import type { OrderStatus, PaymentMethod } from "@prisma/client";
import { formatMoney, paiseToInput, parseRupees } from "@/lib/money";
import { allocateOldestFirst, formatOrderNumber } from "@/lib/pricing";
import { formatDateTime } from "@/lib/time";
import { digitsOnly } from "@/lib/phone";
import { collectForCustomerAction } from "@/app/actions/orders";
import { StatusBadge } from "@/components/status-badge";
import { useLocale, useT } from "@/lib/i18n/client";
import { itemNames } from "@/lib/i18n";
import { sizeName } from "@/lib/categories";
import { PaymentSheet } from "@/components/payment-sheet";
import { Sheet } from "@/components/sheet";
import { MethodPicker } from "@/components/method-picker";

export type DueOrder = {
  id: string;
  orderNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  phoneKey: string | null;
  tableNumber: string | null;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: OrderStatus;
  createdAt: string;
  age: string;
  overdue: boolean;
  items: { id: string; itemName: string; itemNameHi: string | null; variantName: string | null; quantity: number; lineTotal: number }[];
  payments: { id: string; amount: number; method: PaymentMethod; paidAt: string }[];
};

type Group = { phoneKey: string; name: string | null; phone: string; bills: DueOrder[]; due: number };

function matches(o: DueOrder, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase().trim();
  const num = lower.replace(/^#/, "");
  if (/^\d+$/.test(num) && Number(num) === o.orderNumber) return true;
  const digits = digitsOnly(q);
  if (digits.length >= 3 && digitsOnly(o.customerPhone).includes(digits)) return true;
  return !!o.customerName && o.customerName.toLowerCase().includes(lower);
}

export function DuesList({ orders, initialFilter }: { orders: DueOrder[]; initialFilter: string }) {
  const t = useT();
  const [filter, setFilter] = useState(initialFilter);
  const deferred = useDeferredValue(filter);
  const [paying, setPaying] = useState<DueOrder | null>(null);
  const [collecting, setCollecting] = useState<Group | null>(null);

  const visible = useMemo(() => orders.filter((o) => matches(o, deferred)), [orders, deferred]);

  // Customers (by phone) with more than one open bill. A group counts all of the
  // customer's bills (like the server does) and shows when any of them is visible.
  const allGroups = useMemo(() => {
    const byKey = new Map<string, Group>();
    for (const o of orders) {
      if (!o.phoneKey) continue;
      const g = byKey.get(o.phoneKey) ?? { phoneKey: o.phoneKey, name: null, phone: o.customerPhone ?? "", bills: [], due: 0 };
      g.bills.push(o);
      g.due += o.balanceDue;
      g.name = o.customerName ?? g.name; // latest name wins
      byKey.set(o.phoneKey, g);
    }
    return [...byKey.values()].filter((g) => g.bills.length > 1).sort((a, b) => b.due - a.due);
  }, [orders]);
  const groups = useMemo(() => {
    const keys = new Set(visible.map((o) => o.phoneKey));
    return allGroups.filter((g) => keys.has(g.phoneKey));
  }, [allGroups, visible]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("dues.filter")}
          className="input pl-10"
          aria-label={t("dues.filter")}
        />
        {filter && (
          <button type="button" onClick={() => setFilter("")} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-cream-deep" aria-label={t("dues.clearFilter")}>
            <X size={16} />
          </button>
        )}
      </div>

      {groups.length > 0 && (
        <section className="rounded-card border border-rani/20 bg-rani-soft/60 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-rani-dark">
            <HandCoins size={20} /> {t("dues.oneGo")}
          </h2>
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.phoneKey} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{g.name ?? g.phone}</div>
                  <div className="text-xs text-muted">
                    {t("dues.groupLine", { n: g.bills.length, amount: formatMoney(g.due) })}
                  </div>
                </div>
                <button type="button" className="btn-accent btn-sm shrink-0" onClick={() => setCollecting(g)}>
                  {t("common.collect")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visible.length === 0 ? (
        <p className="card px-4 py-10 text-center text-sm text-muted">{t("dues.noMatch", { q: deferred })}</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((o) => (
            <DueCard key={o.id} order={o} onPay={() => setPaying(o)} />
          ))}
        </ul>
      )}

      {paying && <PaymentSheet order={paying} open onClose={() => setPaying(null)} />}
      {collecting && <CollectSheet group={collecting} onClose={() => setCollecting(null)} />}
    </div>
  );
}

function DueCard({ order: o, onPay }: { order: DueOrder; onPay: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <li className={`card overflow-hidden ${o.overdue ? "border-l-4 border-l-danger" : ""}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/orders/${o.id}`} className="font-display text-lg font-semibold hover:underline">
                {formatOrderNumber(o.orderNumber)}
              </Link>
              <StatusBadge status={o.status} />
              {o.overdue && <span className="inline-flex h-6 items-center rounded-full bg-danger px-2.5 text-xs font-bold text-white">{t("dues.over24")}</span>}
            </div>
            <div className="mt-0.5 truncate font-medium">{o.customerName ?? t("common.walkIn")}</div>
            <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
              {o.customerPhone && (
                <a href={`tel:${o.customerPhone}`} className="flex items-center gap-1 hover:text-leaf">
                  <Phone size={12} /> {o.customerPhone}
                </a>
              )}
              {o.tableNumber && <span>{t("common.table", { n: o.tableNumber })}</span>}
              <span className="flex items-center gap-1">
                <Clock size={12} /> {o.age}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">{t("dues.due")}</div>
            <div className="font-display text-2xl font-semibold text-danger tabular-nums">{formatMoney(o.balanceDue)}</div>
            <div className="text-xs text-muted tabular-nums">
              {t("dues.of", { amount: formatMoney(o.total) })}
              {o.amountPaid > 0 && <> · {t("dues.paidAmt", { amount: formatMoney(o.amountPaid) })}</>}
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-primary btn-sm flex-1" onClick={onPay}>
            {t("dues.record")}
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {t("dues.details")} <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-cream/60 px-4 py-3 text-sm">
          <ul className="space-y-1">
            {o.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-2">
                <span>
                  {it.quantity} × {itemNames({ name: it.itemName, nameHi: it.itemNameHi }, locale).primary}
                  {it.variantName && <span className="text-muted"> · {sizeName(it.variantName, locale)}</span>}
                </span>
                <span className="tabular-nums">{formatMoney(it.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">{t("dues.payments")}</div>
          {o.payments.length === 0 ? (
            <p className="text-muted">{t("dues.noPayments", { date: formatDateTime(o.createdAt, locale) })}</p>
          ) : (
            <ul className="space-y-0.5">
              {o.payments.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="text-muted">
                    {formatDateTime(p.paidAt, locale)} · {t(`method.${p.method}` as const)}
                  </span>
                  <span className="tabular-nums">{formatMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function CollectSheet({ group, onClose }: { group: Group; onClose: () => void }) {
  const router = useRouter();
  const t = useT();
  const [amount, setAmount] = useState(paiseToInput(group.due));
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const paise = parseRupees(amount) ?? 0;
  // Bills are already oldest first.
  const plan = allocateOldestFirst(group.bills, Math.min(paise, group.due));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (paise <= 0) return setError(t("err.amountPositive"));
    if (paise > group.due) return setError(t("err.overTotalDue", { due: formatMoney(group.due) }));
    start(async () => {
      const res = await collectForCustomerAction(group.phoneKey, paise, method);
      if (!res.ok) return setError(res.error);
      onClose();
      router.refresh();
    });
  }

  return (
    <Sheet open onClose={onClose} title={t("dues.collectFrom", { name: group.name ?? group.phone })}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          {t("dues.collectIntro", { n: group.bills.length, amount: formatMoney(group.due) })}
        </p>
        <div>
          <label htmlFor="collect-amount" className="label">{t("common.amountRs")}</label>
          <input id="collect-amount" className="input text-lg font-semibold" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^\d.]/g, "")); setError(null); }} autoFocus />
        </div>
        <MethodPicker value={method} onChange={setMethod} />

        <div className="rounded-xl border border-line">
          <div className="border-b border-line px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("dues.settles")}</div>
          <ul className="divide-y divide-line text-sm">
            {plan.map(({ bill, apply, remaining }) => (
              <li key={bill.id} className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span>
                  <b>{formatOrderNumber(bill.orderNumber)}</b> <span className="text-muted">· {bill.age}</span>
                </span>
                <span className="text-right tabular-nums">
                  {apply > 0 ? <span className="font-semibold text-ok">{formatMoney(apply)}</span> : <span className="text-muted">—</span>}
                  <span className="block text-xs text-muted">{remaining === 0 ? t("dues.settled") : t("dues.left", { amount: formatMoney(remaining) })}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {error && <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}
        <button className="btn-accent h-14 w-full text-base" disabled={pending}>
          {pending && <LoaderCircle size={18} className="animate-spin" />}
          {paise > 0 ? t("dues.collectBtn", { amount: formatMoney(paise) }) : t("common.collect")}
        </button>
      </form>
    </Sheet>
  );
}
