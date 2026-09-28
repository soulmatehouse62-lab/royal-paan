"use client";

import type { KotTicketView } from "@/lib/table-orders";
import { formatDateTime } from "@/lib/time";
import { sizeName } from "@/lib/categories";
import { useLocale, useT } from "@/lib/i18n/client";

/** Kitchen ticket: no prices. The element with id="kot" is the only thing printed. */
export function KotTicket({ kot }: { kot: KotTicketView }) {
  const t = useT();
  const locale = useLocale();
  const itemCount = kot.items.reduce((s, i) => s + i.quantity, 0);
  return (
    <article id="kot" className="card mx-auto w-full max-w-sm px-5 py-5 font-sans text-ink">
      <header className="border-b border-dashed border-ink/40 pb-3 text-center">
        <p className="text-sm font-semibold">{t("brand.name")}</p>
        <p className="mt-1 font-display text-2xl font-bold tracking-wide">{t("kot.title")}</p>
      </header>

      <div className="grid grid-cols-2 gap-y-0.5 border-b border-dashed border-ink/40 py-3 text-sm">
        <span className="font-bold">KOT #{String(kot.kotNumber).padStart(4, "0")}</span>
        <span className="text-right">{formatDateTime(kot.printedAt, locale)}</span>
        <span className="text-lg font-bold">{t("common.table", { n: kot.tableNumber })}</span>
        <span className="self-end text-right">{t("kot.staff", { name: kot.staffName })}</span>
      </div>

      <table className="w-full border-b border-dashed border-ink/40 text-base">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide">
            <th className="w-12 py-2 font-semibold">{t("receipt.qty")}</th>
            <th className="py-2 font-semibold">{t("receipt.item")}</th>
          </tr>
        </thead>
        <tbody>
          {kot.items.map((it, i) => (
            <tr key={i} className="align-top">
              <td className="py-1 text-lg font-bold tabular-nums">{it.quantity} ×</td>
              <td className="py-1">
                <div className="font-semibold leading-tight">
                  {it.name}
                  {it.variantName && <span> · {sizeName(it.variantName, locale)}</span>}
                </div>
                {it.nameHi && <div className="text-sm">{it.nameHi}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="pt-2 text-center text-xs">{t("kot.itemCount", { n: itemCount })}</p>
    </article>
  );
}
