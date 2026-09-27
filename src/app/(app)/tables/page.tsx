import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { TableDashboardClient } from "@/components/tables/table-dashboard-client";

export default async function TablesPage() {
  const user = await requireUser();

  const tables = await prisma.table.findMany({
    where: { isActive: true },
    include: {
      tableOrders: {
        where: {
          status: { in: ["RUNNING", "BILLED"] },
          closedAt: null,
        },
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          staff: { select: { name: true } },
          items: { select: { quantity: true, lineTotal: true } },
        },
      },
    },
    orderBy: [{ area: "asc" }, { tableNumber: "asc" }],
  });

  const formattedTables = tables.map((table) => ({
    id: table.id,
    tableNumber: table.tableNumber,
    name: table.name || undefined,
    capacity: table.capacity,
    area: table.area,
    status: table.tableOrders.length > 0
      ? table.tableOrders[0].status === "BILLED"
        ? ("BILLED" as const)
        : ("OCCUPIED" as const)
      : ("AVAILABLE" as const),
    runningTotal: table.tableOrders[0]?.items.reduce((sum, item) => sum + item.lineTotal, 0),
    timeStarted: table.tableOrders[0]?.createdAt,
    staffName: table.tableOrders[0]?.staff?.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Table Management</h1>
        <p className="text-muted mt-1">Manage orders by table</p>
      </div>

      <Suspense fallback={<TablesSkeleton />}>
        <TableDashboardClient tables={formattedTables} />
      </Suspense>
    </div>
  );
}

function TablesSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3 animate-pulse">
          <div className="h-6 bg-skeleton rounded-lg w-3/4" />
          <div className="h-4 bg-skeleton rounded-lg w-1/2" />
          <div className="h-20 bg-skeleton rounded-lg" />
        </div>
      ))}
    </div>
  );
}
