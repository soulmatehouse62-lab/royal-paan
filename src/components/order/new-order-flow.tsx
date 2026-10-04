"use client";

import { useState, useTransition } from "react";
import type { MenuEntry } from "@/lib/menu-data";
import type { SentLine } from "@/lib/table-orders";
import { getSentLinesAction } from "@/app/actions/tables";
import { Loader } from "@/components/loader";
import { OrderBuilder } from "./order-builder";
import { TablePicker, type PickerTable } from "./table-picker";

type Picked = { table: string | null; sent: SentLine[] };

export function NewOrderFlow({ menu, tables, maxDiscountPct }: { menu: MenuEntry[]; tables: PickerTable[]; maxDiscountPct: number }) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  function pick(table: string | null) {
    setError(null);
    window.scrollTo({ top: 0 });
    if (table === null) return setPicked({ table: null, sent: [] });
    startLoading(async () => {
      const res = await getSentLinesAction(table);
      if (!res.ok) return setError(res.error);
      setPicked({ table, sent: res.data });
    });
  }

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (tables.length > 0 && picked === null) {
    return (
      <>
        {error && <p role="alert" className="mb-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}
        <TablePicker tables={tables} onPick={pick} />
      </>
    );
  }

  return (
    <OrderBuilder
      key={picked?.table ?? "takeaway"}
      menu={menu}
      fixedTable={tables.length > 0 ? (picked?.table ?? null) : undefined}
      initialSent={picked?.sent}
      onChangeTable={() => setPicked(null)}
      maxDiscountPct={maxDiscountPct}
    />
  );
}
