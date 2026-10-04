"use client";

import type { DiscountType, OrderStatus, PaymentMethod } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { formatOrderNumber } from "@/lib/pricing";
import { sizeName } from "@/lib/categories";
import { useLocale, useT } from "@/lib/i18n/client";
import { itemNames } from "@/lib/i18n";

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
 * Compact thermal-style bill. The element with id="bill" is the only thing printed.
 * `paymentActions` maps a payment id to an extra control (e.g. remove, for admins);
 * when given, the payments are listed on screen only.
 */
export function Receipt({ order, paymentActions }: { order: ReceiptView; paymentActions?: Record<string, React.ReactNode> }) {
  const t = useT();
  const locale = useLocale();
  const methods = [...new Set(order.payments.map((p) => t(`method.${p.method}` as const)))].join("/");
  const rule = <div className="my-1.5 border-t border-dashed border-line print:my-1 print:border-black" />;
  return (
    <article id="bill" className="card mx-auto w-full max-w-md px-5 py-5 font-mono text-sm leading-snug text-ink print:text-[9pt] print:text-black">
      <div className="text-center">
        <div className="font-bold print:text-[10pt]">{t("brand.name")}</div>
        <div className="text-xs print:text-[9pt]">{t("brand.address")}</div>
      </div>
      {rule}
      <div className="flex justify-between font-bold">
        <span>{t("receipt.bill", { no: formatOrderNumber(order.orderNumber) })}</span>
        <span>{t(`status.${order.status}` as const)}</span>
      </div>
      <div>
        {formatDateTime(order.createdAt, locale)}
        {order.tableNumber && <> • {t("common.table", { n: order.tableNumber })}</>}
      </div>
      {rule}
      <table className="w-full">
        <thead>
          <tr className="text-left uppercase">
            <th className="font-bold">{t("receipt.item")}</th>
            <th className="w-10 text-center font-bold">{t("receipt.qty")}</th>
            <th className="w-20 text-right font-bold">{t("receipt.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="align-top">
              <td className="pr-1 text-base font-bold print:text-[10.5pt]">
                {itemNames({ name: it.itemName, nameHi: it.itemNameHi }, locale).primary}
                {it.variantName && ` (${sizeName(it.variantName, locale)})`}
              </td>
              <td className="text-center">{it.quantity}</td>
              <td className="text-right">{formatMoney(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rule}
      <div className="flex justify-between">
        <span>{t("receipt.subtotal")}</span>
        <span>{formatMoney(order.subtotal)}</span>
      </div>
      {order.discountAmount > 0 && (
        <div className="flex justify-between">
          <span>{order.discountType === "PERCENT" ? t("receipt.discountPct", { p: order.discountValue ?? 0 }) : t("receipt.discount")}</span>
          <span>− {formatMoney(order.discountAmount)}</span>
        </div>
      )}
      {rule}
      <div className="flex justify-between text-base font-bold print:text-[10pt]">
        <span>
          {t("receipt.total").toUpperCase()}
          {methods && ` (${methods})`}
        </span>
        <span>{formatMoney(order.total)}</span>
      </div>
      {order.balanceDue > 0 && (
        <div className="flex justify-between font-bold text-danger print:text-black">
          <span>{t("receipt.balance")}</span>
          <span>{formatMoney(order.balanceDue)}</span>
        </div>
      )}
      {rule}
      <div className="text-center">{t("receipt.thanks")}</div>

      {paymentActions && order.payments.length > 0 && (
        <div className="no-print mt-4 border-t border-line pt-3 font-sans">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("receipt.payments")}</div>
          <ul className="space-y-1">
            {order.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="text-muted">
                  {formatDateTime(p.paidAt, locale)} · {t(`method.${p.method}` as const)}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  {formatMoney(p.amount)}
                  {paymentActions[p.id]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
