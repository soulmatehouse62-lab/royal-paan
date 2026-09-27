"use client";

import type { DiscountType, OrderStatus, PaymentMethod } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { formatOrderNumber } from "@/lib/pricing";
import { sizeName } from "@/lib/categories";
import { useLocale, useT } from "@/lib/i18n/client";
import { itemNames } from "@/lib/i18n";
import { StatusBadge } from "@/components/status-badge";

export type ReceiptView = {
  orderNumber: number;
  createdAt: Date | string;
  customerName: string | null;
  customerPhone: string | null;
  tableNumber: string | null;
  subtotal: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: OrderStatus;
  items: { id: string; itemName: string; itemNameHi?: string | null; variantName: string | null; unitPrice: number; quantity: number; lineTotal: number }[];
  payments: { id: string; amount: number; method: PaymentMethod; paidAt: Date | string }[];
};

/**
 * Receipt-style bill. The element with id="bill" is the only thing printed.
 * `paymentActions` maps a payment id to an extra control (e.g. remove, for admins).
 */
export function Receipt({ order, paymentActions }: { order: ReceiptView; paymentActions?: Record<string, React.ReactNode> }) {
  const t = useT();
  const locale = useLocale();
  return (
    <article id="bill" className="card mx-auto w-full max-w-md px-5 py-6 font-sans">
      <header className="border-b border-dashed border-line pb-4 text-center">
        <h2 className="font-display text-xl font-semibold text-leaf-dark">{t("brand.name")}</h2>
        <p className="mt-0.5 text-xs text-muted">{t("brand.address")}</p>
      </header>

      <div className="flex items-start justify-between gap-3 border-b border-dashed border-line py-3 text-sm">
        <div>
          <div className="font-display text-lg font-semibold">{t("receipt.bill", { no: formatOrderNumber(order.orderNumber) })}</div>
          <div className="text-muted">{formatDateTime(order.createdAt, locale)}</div>
          {order.tableNumber && <div className="text-muted">{t("common.table", { n: order.tableNumber })}</div>}
        </div>
        <div className="text-right">
          <StatusBadge status={order.status} />
          {order.customerName && <div className="mt-1 font-medium">{order.customerName}</div>}
          {order.customerPhone && <div className="text-muted">{order.customerPhone}</div>}
        </div>
      </div>

      <table className="w-full border-b border-dashed border-line text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 font-semibold">{t("receipt.item")}</th>
            <th className="py-2 text-center font-semibold">{t("receipt.qty")}</th>
            <th className="py-2 text-right font-semibold">{t("receipt.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => {
            const n = itemNames({ name: it.itemName, nameHi: it.itemNameHi }, locale);
            return (
              <tr key={it.id} className="align-top">
                <td className="py-1.5 pr-2">
                  <div className="font-medium">
                    {n.primary}
                    {it.variantName && <span className="text-muted"> · {sizeName(it.variantName, locale)}</span>}
                  </div>
                  <div className="text-xs text-muted">@ {formatMoney(it.unitPrice)}</div>
                </td>
                <td className="py-1.5 text-center tabular-nums">{it.quantity}</td>
                <td className="py-1.5 text-right tabular-nums">{formatMoney(it.lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <dl className="space-y-1 py-3 text-sm tabular-nums">
        <Row label={t("receipt.subtotal")} value={formatMoney(order.subtotal)} />
        {order.discountAmount > 0 && (
          <Row
            label={order.discountType === "PERCENT" ? t("receipt.discountPct", { p: order.discountValue ?? 0 }) : t("receipt.discount")}
            value={`− ${formatMoney(order.discountAmount)}`}
          />
        )}
        <div className="flex items-baseline justify-between border-t border-line pt-2 text-base font-bold">
          <dt>{t("receipt.total")}</dt>
          <dd className="font-display text-xl">{formatMoney(order.total)}</dd>
        </div>
        <Row label={t("receipt.paid")} value={formatMoney(order.amountPaid)} />
        {order.balanceDue > 0 && (
          <div className="flex justify-between font-bold text-danger">
            <dt>{t("receipt.balance")}</dt>
            <dd>{formatMoney(order.balanceDue)}</dd>
          </div>
        )}
      </dl>

      {order.payments.length > 0 && (
        <div className="border-t border-dashed border-line pt-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("receipt.payments")}</div>
          <ul className="space-y-1">
            {order.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="text-muted">
                  {formatDateTime(p.paidAt, locale)} · {t(`method.${p.method}` as const)}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  {formatMoney(p.amount)}
                  {paymentActions?.[p.id]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 text-center text-sm text-muted">{t("receipt.thanks")}</p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
