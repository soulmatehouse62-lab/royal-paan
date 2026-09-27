import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getReceipt } from "@/lib/orders";
import { getMenu } from "@/lib/menu-data";
import { formatOrderNumber } from "@/lib/pricing";
import { OrderBuilder } from "@/components/order/order-builder";
import { PageTitle } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("order.editTitle") };
}

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [order, menu, t] = await Promise.all([getReceipt(id), getMenu(), getT()]);
  if (!order) notFound();

  return (
    <>
      <PageTitle title={t("order.edit", { no: formatOrderNumber(order.orderNumber) })} subtitle={t("order.editSubtitle")} />
      <OrderBuilder
        menu={menu.filter((m) => m.isAvailable)}
        edit={{
          orderId: order.id,
          lines: order.items.map((it) => ({
            key: `line:${it.id}`,
            lineId: it.id,
            menuItemId: it.menuItemId,
            name: it.itemName,
            nameHi: it.itemNameHi,
            variantName: it.variantName,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
          })),
          customerName: order.customerName ?? "",
          customerPhone: order.customerPhone ?? "",
          tableNumber: order.tableNumber ?? "",
          discountType: order.discountType,
          discountValue: order.discountValue,
          amountPaid: order.amountPaid,
        }}
      />
    </>
  );
}
