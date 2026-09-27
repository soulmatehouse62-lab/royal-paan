"use client";

import type { OrderStatus } from "@prisma/client";
import { useT } from "@/lib/i18n/client";

const CLS: Record<OrderStatus, string> = {
  PAID: "bg-ok-soft text-ok",
  PARTIAL: "bg-warn-soft text-warn",
  UNPAID: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = useT();
  return <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold ${CLS[status]}`}>{t(`status.${status}` as const)}</span>;
}
