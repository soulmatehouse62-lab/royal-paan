"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus, Trash2, Users } from "lucide-react";
import type { TableArea } from "@prisma/client";
import { createTableAction, deleteTableAction, updateTableAction } from "@/app/actions/tables";
import { useT } from "@/lib/i18n/client";
import { Sheet } from "@/components/sheet";

type Tb = { id: string; tableNumber: string; name: string | null; capacity: number; area: TableArea; isActive: boolean; running: boolean };

const AREAS: TableArea[] = ["INDOOR", "AC_HALL", "OUTDOOR", "OTHER"];

export function TablesManager({ tables }: { tables: Tb[] }) {
  const router = useRouter();
  const t = useT();
  // null = closed, "new" = add form, otherwise the table being edited.
  const [editing, setEditing] = useState<Tb | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function remove(tb: Tb) {
    if (!confirm(t("tables.deleteQ", { n: tb.tableNumber }))) return;
    setBusy(tb.id);
    setError(null);
    start(async () => {
      const res = await deleteTableAction(tb.id);
      setBusy(null);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const groups = AREAS.map((area) => ({ area, list: tables.filter((tb) => tb.area === area) })).filter((g) => g.list.length > 0);

  return (
    <>
      <button type="button" className="btn-accent mb-4 w-full sm:w-auto" onClick={() => setEditing("new")}>
        <Plus size={18} /> {t("tables.add")}
      </button>
      {error && <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}

      {tables.length === 0 && <p className="card p-6 text-center text-muted">{t("tables.empty")}</p>}

      {groups.map(({ area, list }) => (
        <section key={area} className="mb-5">
          <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted">{t(`tables.area.${area}`)}</h2>
          <ul className="space-y-2">
            {list.map((tb) => (
              <li key={tb.id} className={`card flex items-center gap-3 p-3 ${tb.isActive ? "" : "opacity-60"}`}>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl border-t-4 border-t-gold bg-gold-soft font-display text-xl font-semibold">
                  {tb.tableNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{tb.name || t("common.table", { n: tb.tableNumber })}</div>
                  <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {t("tables.seats", { n: tb.capacity })}
                    </span>
                    {tb.running && <span className="font-semibold text-warn">· {t("tables.running")}</span>}
                    {!tb.isActive && <span className="font-semibold text-danger">· {t("tables.inactive")}</span>}
                  </div>
                </div>
                {busy === tb.id ? (
                  <LoaderCircle size={18} className="animate-spin text-muted" />
                ) : (
                  <div className="flex gap-1.5">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(tb)} aria-label={t("tables.edit")}>
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={() => remove(tb)}
                      disabled={tb.running}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editing && (
        <TableSheet
          table={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function TableSheet({ table, onClose, onSaved }: { table: Tb | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      tableNumber: String(f.get("tableNumber") ?? ""),
      name: String(f.get("name") ?? "") || null,
      capacity: Number(f.get("capacity")),
      area: String(f.get("area")),
      isActive: f.get("isActive") === "on",
    };
    setError(null);
    start(async () => {
      const res = table ? await updateTableAction(table.id, input) : await createTableAction(input);
      if (!res.ok) return setError(res.error);
      onSaved();
    });
  }

  return (
    <Sheet open onClose={onClose} title={table ? t("tables.edit") : t("tables.add")}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="t-number" className="label">{t("tables.number")}</label>
            <input id="t-number" name="tableNumber" className="input" required maxLength={10} defaultValue={table?.tableNumber} placeholder="12" autoFocus />
          </div>
          <div>
            <label htmlFor="t-capacity" className="label">{t("tables.capacity")}</label>
            <input id="t-capacity" name="capacity" type="number" inputMode="numeric" className="input" required min={1} max={50} defaultValue={table?.capacity ?? 4} />
          </div>
        </div>
        <div>
          <label htmlFor="t-name" className="label">{t("tables.nameOptional")}</label>
          <input id="t-name" name="name" className="input" maxLength={40} defaultValue={table?.name ?? ""} placeholder={t("tables.namePh")} />
        </div>
        <div>
          <label htmlFor="t-area" className="label">{t("tables.area")}</label>
          <select id="t-area" name="area" className="input" defaultValue={table?.area ?? "INDOOR"}>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {t(`tables.area.${a}`)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
          <input type="checkbox" name="isActive" defaultChecked={table?.isActive ?? true} className="size-5 accent-[var(--color-leaf)]" />
          <span className="text-[15px]">{t("tables.active")}</span>
        </label>
        {error && <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending && <LoaderCircle size={18} className="animate-spin" />} {t("tables.save")}
        </button>
      </form>
    </Sheet>
  );
}
