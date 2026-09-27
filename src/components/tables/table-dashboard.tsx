import { THEME_COLORS } from "@/lib/theme-colors";

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

interface TableDashboardProps {
  tables: TableInfo[];
  onTableClick: (tableId: string) => void;
}

export function TableDashboard({ tables, onTableClick }: TableDashboardProps) {
  const groupedTables = tables.reduce(
    (acc, table) => {
      const area = table.area || "OTHER";
      if (!acc[area]) acc[area] = [];
      acc[area].push(table);
      return acc;
    },
    {} as Record<string, TableInfo[]>
  );

  const getStatusColor = (status: TableInfo["status"]) => {
    switch (status) {
      case "AVAILABLE":
        return THEME_COLORS.tableStatus.available;
      case "OCCUPIED":
        return THEME_COLORS.tableStatus.occupied;
      case "BILLED":
        return THEME_COLORS.tableStatus.billed;
      default:
        return THEME_COLORS.brown.muted;
    }
  };

  const getStatusLabel = (status: TableInfo["status"]) => {
    const labels: Record<TableInfo["status"], string> = {
      AVAILABLE: "Available",
      OCCUPIED: "Occupied",
      BILLED: "Pending Payment",
    };
    return labels[status];
  };

  const getTimeElapsed = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedTables).map(([area, areaTables]) => (
        <section key={area}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            {area === "OTHER" ? "Other Areas" : area}
          </h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {areaTables.map((table) => (
              <button
                key={table.id}
                onClick={() => onTableClick(table.id)}
                className="card group overflow-hidden transition-all hover:shadow-float active:scale-95"
                style={{
                  borderTop: `4px solid ${getStatusColor(table.status)}`,
                }}
              >
                <div className="p-4">
                  {/* Table Header */}
                  <div className="flex items-baseline justify-between mb-3">
                    <h3 className="text-lg font-semibold text-ink">
                      {table.name || `Table ${table.tableNumber}`}
                    </h3>
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full text-white"
                      style={{
                        backgroundColor: getStatusColor(table.status),
                      }}
                    >
                      {getStatusLabel(table.status)}
                    </span>
                  </div>

                  {/* Capacity */}
                  <p className="text-sm text-muted mb-3">
                    Capacity: {table.capacity} seats
                  </p>

                  {/* Occupied State Info */}
                  {(table.status === "OCCUPIED" || table.status === "BILLED") && (
                    <div
                      className="rounded-lg p-3 space-y-2"
                      style={{
                        backgroundColor: `${getStatusColor(table.status)}10`,
                      }}
                    >
                      {table.runningTotal !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted">Total:</span>
                          <span className="font-semibold text-ink">
                            ₹{(table.runningTotal / 100).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {table.timeStarted && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted">Time:</span>
                          <span className="font-semibold text-ink">
                            {getTimeElapsed(table.timeStarted)}
                          </span>
                        </div>
                      )}
                      {table.staffName && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted">Staff:</span>
                          <span className="font-semibold text-ink">
                            {table.staffName}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
