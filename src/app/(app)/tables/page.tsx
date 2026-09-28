import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { requireAdminPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { TablesManager } from "./tables-manager";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("tables.manage") };
}

export default async function TablesPage() {
  const [, t] = await Promise.all([requireAdminPage(), getT()]);
  const tables = await prisma.table.findMany({
    select: { id: true, tableNumber: true, name: true, capacity: true, area: true, isActive: true, activeOrderId: true },
  });
  tables.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }));

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("tables.manage")} subtitle={t("tables.manageHint")} />
      <TablesManager tables={tables.map(({ activeOrderId, ...tb }) => ({ ...tb, running: !!activeOrderId }))} />
    </div>
  );
}
