import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getReceipt } from "@/lib/orders";
import { formatOrderNumber } from "@/lib/pricing";
import { getT } from "@/lib/i18n/server";
import { Receipt } from "@/components/receipt";
import { OrderActions, RemovePaymentButton } from "./order-actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireUser();
  const [order, t] = await Promise.all([getReceipt((await params).id), getT()]);
  return { title: order ? t("order.title", { no: formatOrderNumber(order.orderNumber) }) : t("order.notFound") };
}

export default async function OrderPage({ params }: Props) {
  const [user, t, { id }] = await Promise.all([requireUser(), getT(), params]);
  const order = await getReceipt(id); // malformed ids return null
  if (!order) notFound();
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="no-print flex items-center justify-between">
        <Link href="/history" className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft size={16} /> {t("nav.history")}
        </Link>
        <Link href={`/orders/${order.id}/edit`} className="btn-ghost btn-sm">
          <Pencil size={15} /> {t("order.edit", { no: formatOrderNumber(order.orderNumber) })}
        </Link>
      </div>

      <Receipt
        order={order}
        paymentActions={
          isAdmin
            ? Object.fromEntries(order.payments.map((p) => [p.id, <RemovePaymentButton key={p.id} orderId={order.id} paymentId={p.id} />]))
            : undefined
        }
      />

      <OrderActions
        order={{ id: order.id, orderNumber: order.orderNumber, balanceDue: order.balanceDue, customerName: order.customerName }}
        isAdmin={isAdmin}
      />
    </div>
  );
}
