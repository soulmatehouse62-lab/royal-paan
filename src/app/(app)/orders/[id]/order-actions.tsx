"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, LoaderCircle, Printer, Trash2, X } from "lucide-react";
import { deleteOrderAction, removePaymentAction } from "@/app/actions/orders";
import { formatOrderNumber } from "@/lib/pricing";
import { PaymentSheet } from "@/components/payment-sheet";
import { Sheet } from "@/components/sheet";
import { useT } from "@/lib/i18n/client";

type Order = { id: string; orderNumber: number; balanceDue: number; customerName: string | null };

export function OrderActions({ order, isAdmin }: { order: Order; isAdmin: boolean }) {
  const t = useT();
  const [paying, setPaying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove() {
    start(async () => {
      const res = await deleteOrderAction(order.id); // redirects on success
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="no-print space-y-2.5">
      {order.balanceDue > 0 && (
        <button type="button" className="btn-accent h-14 w-full text-base" onClick={() => setPaying(true)}>
          <HandCoins size={20} /> {t("dues.record")}
        </button>
      )}
      <button type="button" className="btn-ghost w-full" onClick={() => window.print()}>
        <Printer size={18} /> {t("common.printBill")}
      </button>
      {isAdmin && (
        <button type="button" className="btn-danger w-full" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={18} /> {t("order.delete")}
        </button>
      )}

      {paying && <PaymentSheet order={order} open onClose={() => setPaying(false)} />}
      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t("order.deleteQ", { no: formatOrderNumber(order.orderNumber) })}>
        <p className="mb-4 text-sm text-muted">{t("order.deleteWarn")}</p>
        {error && <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)}>{t("order.keepIt")}</button>
          <button type="button" className="btn bg-danger text-white" onClick={remove} disabled={pending}>
            {pending && <LoaderCircle size={18} className="animate-spin" />} {t("common.delete")}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

export function RemovePaymentButton({ orderId, paymentId }: { orderId: string; paymentId: string }) {
  const router = useRouter();
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="no-print grid size-7 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
      aria-label={t("order.removePayment")}
      disabled={pending}
      onClick={() => {
        if (!confirm(t("order.removePaymentQ"))) return;
        start(async () => {
          const res = await removePaymentAction(orderId, paymentId);
          if (!res.ok) alert(res.error);
          router.refresh();
        });
      }}
    >
      {pending ? <LoaderCircle size={14} className="animate-spin" /> : <X size={14} />}
    </button>
  );
}
