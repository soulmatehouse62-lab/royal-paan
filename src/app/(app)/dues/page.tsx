import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { ReceiptText } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatAge } from "@/lib/time";
import { PageTitle, Empty } from "@/components/ui";
import { DuesList, type DueOrder } from "./dues-list";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("dues.title") };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function DuesPage({ searchParams }: { searchParams: Promise<{ phone?: string; q?: string }> }) {
  const [, t, { phone, q }] = await Promise.all([requireUser(), getT(), searchParams]);

  const orders = await prisma.order.findMany({
    where: { balanceDue: { gt: 0 } },
    orderBy: [{ createdAt: "asc" }, { orderNumber: "asc" }],
    take: 1000,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerPhone: true,
      phoneKey: true,
      tableNumber: true,
      total: true,
      amountPaid: true,
      balanceDue: true,
      status: true,
      createdAt: true,
      items: { select: { id: true, itemName: true, itemNameHi: true, variantName: true, quantity: true, lineTotal: true } },
      payments: { select: { id: true, amount: true, method: true, paidAt: true }, orderBy: { paidAt: "asc" } },
    },
  });

  const now = new Date();
  const dues: DueOrder[] = orders.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    payments: o.payments.map((p) => ({ ...p, paidAt: p.paidAt.toISOString() })),
    age: formatAge(o.createdAt, t, now),
    overdue: now.getTime() - o.createdAt.getTime() > DAY_MS,
  }));
  const totalDue = dues.reduce((s, o) => s + o.balanceDue, 0);

  return (
    <>
      <PageTitle
        title={t("dues.title")}
        subtitle={dues.length ? t("dues.subtitle", { n: dues.length, amount: formatMoney(totalDue) }) : undefined}
      />
      {dues.length === 0 ? (
        <Empty icon={<ReceiptText />} title={t("dues.none")}>
          {t("dues.noneHint")}
        </Empty>
      ) : (
        <DuesList orders={dues} initialFilter={phone ?? q ?? ""} />
      )}
    </>
  );
}
