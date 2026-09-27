"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import type { PaymentMethod } from "@prisma/client";
import { addPaymentAction } from "@/app/actions/orders";
import { formatMoney, paiseToInput, parseRupees } from "@/lib/money";
import { formatOrderNumber } from "@/lib/pricing";
import { useT } from "@/lib/i18n/client";
import { Sheet } from "@/components/sheet";
import { MethodPicker } from "@/components/method-picker";

/** "Record payment" – full or partial. */
export function PaymentSheet({
  order,
  open,
  onClose,
}: {
  order: { id: string; orderNumber: number; balanceDue: number; customerName: string | null };
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const [amount, setAmount] = useState(paiseToInput(order.balanceDue));
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const paise = parseRupees(amount);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!paise || paise <= 0) return setError(t("err.amountPositive"));
    if (paise > order.balanceDue) return setError(t("err.overBalance", { due: formatMoney(order.balanceDue) }));
    start(async () => {
      const res = await addPaymentAction(order.id, paise, method);
      if (!res.ok) return setError(res.error);
      onClose();
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("pay.title", { no: formatOrderNumber(order.orderNumber) })}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">
          {t("pay.owes", { name: order.customerName ?? t("common.walkIn"), amount: formatMoney(order.balanceDue) })}
        </p>
        <div>
          <label htmlFor="pay-amount" className="label">{t("common.amountRs")}</label>
          <input id="pay-amount" className="input text-lg font-semibold" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^\d.]/g, "")); setError(null); }} autoFocus />
          <div className="mt-2 flex gap-1.5">
            <button type="button" className="chip h-9 border-line bg-white" onClick={() => setAmount(paiseToInput(order.balanceDue))}>
              {t("pay.full", { amount: formatMoney(order.balanceDue) })}
            </button>
            {order.balanceDue >= 200 && (
              <button type="button" className="chip h-9 border-line bg-white" onClick={() => setAmount(paiseToInput(Math.round(order.balanceDue / 200) * 100))}>
                {t("pay.half")}
              </button>
            )}
          </div>
          {paise !== null && paise > 0 && paise < order.balanceDue && (
            <p className="mt-1.5 text-sm text-muted">{t("pay.stillDue", { amount: formatMoney(order.balanceDue - paise) })}</p>
          )}
        </div>
        <MethodPicker value={method} onChange={setMethod} />
        {error && <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}
        <button className="btn-primary h-14 w-full text-base" disabled={pending}>
          {pending && <LoaderCircle size={18} className="animate-spin" />}
          {paise ? t("pay.record", { amount: formatMoney(paise) }) : t("pay.recordPlain")}
        </button>
      </form>
    </Sheet>
  );
}
