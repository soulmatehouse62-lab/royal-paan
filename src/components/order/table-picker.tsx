"use client";

import { ShoppingBag, Users } from "lucide-react";
import type { TableArea } from "@prisma/client";
import { useT } from "@/lib/i18n/client";
import { formatMoney } from "@/lib/money";
import { formatAge } from "@/lib/time";

export type PickerTable = {
  id: string;
  tableNumber: string;
  name: string | null;
  capacity: number;
  area: TableArea;
  running: { subtotal: number; since: Date; staffName: string } | null;
};

const AREA_ORDER: TableArea[] = ["INDOOR", "AC_HALL", "OUTDOOR", "OTHER"];

export function TablePicker({ tables, onPick }: { tables: PickerTable[]; onPick: (tableNumber: string | null) => void }) {
  const t = useT();
  const groups = AREA_ORDER.map((area) => ({ area, tables: tables.filter((tb) => tb.area === area) })).filter((g) => g.tables.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("tables.pick")}</h1>
          <p className="text-sm text-muted">{t("tables.pickHint")}</p>
        </div>
        <button type="button" onClick={() => onPick(null)} className="btn-ghost">
          <ShoppingBag size={18} /> {t("tables.takeaway")}
        </button>
      </div>

      {groups.map(({ area, tables: list }) => (
        <section key={area}>
          <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted">{t(`tables.area.${area}`)}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {list.map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => onPick(tb.tableNumber)}
                className={`card flex aspect-square flex-col items-center justify-center gap-1 border-t-4 p-2 text-center transition hover:shadow-float active:scale-95 ${
                  tb.running ? "border-t-warn bg-warn-soft" : "border-t-ok"
                }`}
              >
                <span className="font-display text-3xl font-semibold leading-none text-ink">{tb.tableNumber}</span>
                {tb.running ? (
                  <>
                    <span className="text-sm font-bold tabular-nums text-warn">{formatMoney(tb.running.subtotal)}</span>
                    <span className="max-w-full truncate text-[11px] text-muted">
                      {formatAge(tb.running.since, t)} · {tb.running.staffName.split(" ")[0]}
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Users size={12} /> {tb.capacity} · {t("tables.free")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
