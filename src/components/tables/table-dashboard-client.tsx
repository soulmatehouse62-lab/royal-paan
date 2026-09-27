"use client";

import { useRouter } from "next/navigation";
import { TableDashboard } from "./table-dashboard";

interface TableInfo {
  id: string;
  tableNumber: string;
  name?: string;
  capacity: number;
  area: string;
  status: "AVAILABLE" | "OCCUPIED" | "BILLED";
  runningTotal?: number;
  timeStarted?: Date;
  staffName?: string;
}

interface TableDashboardClientProps {
  tables: TableInfo[];
}

export function TableDashboardClient({ tables }: TableDashboardClientProps) {
  const router = useRouter();

  const handleTableClick = (tableId: string) => {
    router.push(`/tables/${tableId}/order`);
  };

  return <TableDashboard tables={tables} onTableClick={handleTableClick} />;
}
