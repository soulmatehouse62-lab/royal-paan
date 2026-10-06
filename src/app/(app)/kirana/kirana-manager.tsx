"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Carrot,
  ChevronDown,
  Flame,
  HandCoins,
  House,
  LoaderCircle,
  Milk,
  Pencil,
  Plus,
  ShoppingBasket,
  Trash2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import type { ExpenseCategory, PaymentMethod } from "@prisma/client";
import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { useLocale, useT } from "@/lib/i18n/client";
import { formatMoney, paiseToInput, parseRupees } from "@/lib/money";
import { formatYmdShort } from "@/lib/time";
import { ITEM_UNITS, hasItems, needsStaff, type ItemUnit } from "@/lib/expense-categories";
import { Sheet } from "@/components/sheet";
import { METHODS } from "@/components/ui";

type Item = { name: string; qty: number | null; unit: string | null; amount: number };
type Ex = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  items: Item[];
  note: string | null;
  method: PaymentMethod;
  spentOn: string;
  staffName: string | null;
};

const CATEGORIES: { value: ExpenseCategory; icon: typeof Flame; tone: string }[] = [
  { value: "RATION", icon: ShoppingBasket, tone: "bg-leaf-soft text-leaf" },
  { value: "VEGETABLES", icon: Carrot, tone: "bg-leaf-soft text-leaf" },
  { value: "DAIRY", icon: Milk, tone: "bg-leaf-soft text-leaf" },
  { value: "GAS", icon: Flame, tone: "bg-gold-soft text-gold" },
  { value: "STAFF_ADVANCE", icon: HandCoins, tone: "bg-rani-soft text-rani" },
  { value: "SALARY", icon: Banknote, tone: "bg-rani-soft text-rani" },
  { value: "ELECTRICITY", icon: Zap, tone: "bg-gold-soft text-gold" },
  { value: "RENT", icon: House, tone: "bg-gold-soft text-gold" },
  { value: "OTHER", icon: Wallet, tone: "bg-cream-deep text-muted" },
];
const catOf = (c: ExpenseCategory) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];

const fmtQty = (it: Item) => (it.qty ? `${it.qty}${it.unit ? ` ${it.unit}` : ""}` : "");

export function KiranaManager({ expenses, staffNames, today }: { expenses: Ex[]; staffNames: string[]; today: string }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  // null = closed, "new" = add form, otherwise the entry being edited.
  const [editing, setEditing] = useState<Ex | "new" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function remove(ex: Ex) {
    if (!confirm(t("kirana.deleteQ", { amount: formatMoney(ex.amount) }))) return;
    setBusy(ex.id);
    setError(null);
    start(async () => {
      const res = await deleteExpenseAction(ex.id);
      setBusy(null);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  // Group by day, newest first (the server already sorts).
  const days: { day: string; list: Ex[] }[] = [];
  for (const ex of expenses) {
    const last = days[days.length - 1];
    if (last?.day === ex.spentOn) last.list.push(ex);
    else days.push({ day: ex.spentOn, list: [ex] });
  }

  return (
    <>
      <button type="button" className="btn-accent mb-4 w-full sm:w-auto" onClick={() => setEditing("new")}>
        <Plus size={18} /> {t("kirana.add")}
      </button>
      {error && <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}

      {expenses.length === 0 && <p className="card p-6 text-center text-muted">{t("kirana.empty")}</p>}

      {days.map(({ day, list }) => (
        <section key={day} className="mb-5">
          <h2 className="mb-2 flex justify-between font-sans text-xs font-semibold uppercase tracking-wide text-muted">
            <span>{day === today ? t("kirana.today") : formatYmdShort(day, locale)}</span>
            <span className="tabular-nums">{formatMoney(list.reduce((s, e) => s + e.amount, 0))}</span>
          </h2>
          <ul className="space-y-2">
            {list.map((ex) => {
              const { icon: Icon, tone } = catOf(ex.category);
              const expanded = open === ex.id;
              return (
                <li key={ex.id} className="card p-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>
                      <Icon size={20} />
                    </span>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left disabled:cursor-default"
                      disabled={ex.items.length === 0}
                      aria-expanded={ex.items.length ? expanded : undefined}
                      onClick={() => setOpen(expanded ? null : ex.id)}
                    >
                      <div className="truncate font-semibold">
                        {t(`kirana.cat.${ex.category}`)}
                        {ex.staffName && <span className="font-normal"> · {ex.staffName}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted">
                        <span className="truncate">
                          {t(`method.${ex.method}`)}
                          {ex.items.length > 0 && ` · ${t("kirana.itemCount", { n: ex.items.length })}`}
                          {ex.note && ` · ${ex.note}`}
                        </span>
                        {ex.items.length > 0 && <ChevronDown size={14} className={`shrink-0 transition ${expanded ? "rotate-180" : ""}`} />}
                      </div>
                    </button>
                    <span className="font-display text-lg font-semibold tabular-nums">{formatMoney(ex.amount)}</span>
                    {busy === ex.id ? (
                      <LoaderCircle size={18} className="animate-spin text-muted" />
                    ) : (
                      <div className="flex gap-1.5">
                        <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(ex)} aria-label={t("kirana.edit")}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="btn-danger btn-sm" onClick={() => remove(ex)} aria-label={t("common.delete")}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  {expanded && (
                    <ul className="mt-2 divide-y divide-line border-t border-line pl-14 text-sm">
                      {ex.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-2 py-1.5">
                          <span className="truncate">
                            {it.name}
                            {fmtQty(it) && <span className="text-muted"> · {fmtQty(it)}</span>}
                          </span>
                          <span className="tabular-nums">{formatMoney(it.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {editing && (
        <ExpenseSheet
          expense={editing === "new" ? null : editing}
          staffNames={staffNames}
          today={today}
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

/** One editable item row; all fields are kept as text while typing. */
type Row = { key: number; name: string; qty: string; unit: ItemUnit; amount: string };
let nextKey = 1;
const blankRow = (): Row => ({ key: nextKey++, name: "", qty: "", unit: "kg", amount: "" });
const toRow = (it: Item): Row => ({
  key: nextKey++,
  name: it.name,
  qty: it.qty ? String(it.qty) : "",
  unit: (ITEM_UNITS as readonly string[]).includes(it.unit ?? "") ? (it.unit as ItemUnit) : "kg",
  amount: paiseToInput(it.amount),
});
const isBlank = (r: Row) => !r.name.trim() && !r.qty.trim() && !r.amount.trim();

function ExpenseSheet({
  expense,
  staffNames,
  today,
  onClose,
  onSaved,
}: {
  expense: Ex | null;
  staffNames: string[];
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "RATION");
  const [method, setMethod] = useState<PaymentMethod>(expense?.method ?? "CASH");
  const [rows, setRows] = useState<Row[]>(() => (expense?.items.length ? expense.items.map(toRow) : [blankRow()]));
  // Item list is on for goods by default; it can be switched off to enter just a total.
  const [itemized, setItemized] = useState(expense ? expense.items.length > 0 : hasItems(category));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filled = rows.filter((r) => !isBlank(r));
  const itemsTotal = filled.reduce((s, r) => s + (parseRupees(r.amount) ?? 0), 0);

  function pickCategory(c: ExpenseCategory) {
    setCategory(c);
    // Only switch the item list automatically while nothing has been typed into it.
    if (filled.length === 0) setItemized(hasItems(c));
  }

  const setRow = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const items = itemized
      ? filled.map((r) => ({
          name: r.name,
          qty: r.qty.trim() ? Number(r.qty) : null,
          unit: r.qty.trim() ? r.unit : null,
          amount: r.amount,
        }))
      : [];
    if (itemized && items.length === 0) return setError(t("err.addItem"));
    if (items.some((it) => it.qty !== null && !(it.qty > 0))) return setError(t("err.itemQty"));
    const input = {
      category,
      method,
      items,
      amount: itemized ? null : String(f.get("amount") ?? ""),
      spentOn: String(f.get("spentOn") ?? ""),
      note: String(f.get("note") ?? "") || null,
      staffName: needsStaff(category) ? String(f.get("staffName") ?? "").trim() || null : null,
    };
    setError(null);
    start(async () => {
      const res = expense ? await updateExpenseAction(expense.id, input) : await createExpenseAction(input);
      if (!res.ok) return setError(res.error);
      onSaved();
    });
  }

  return (
    <Sheet open onClose={onClose} title={expense ? t("kirana.edit") : t("kirana.add")}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <span className="label">{t("kirana.category")}</span>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => pickCategory(value)}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 text-[13px] font-semibold leading-tight transition ${
                  category === value ? "border-leaf bg-leaf-soft text-leaf-dark" : "border-line bg-white text-ink"
                }`}
              >
                <Icon size={17} />
                <span className="max-w-full truncate">{t(`kirana.cat.${value}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {needsStaff(category) && (
          <div>
            <label htmlFor="k-staff" className="label">{t("kirana.staffName")}</label>
            <input
              id="k-staff"
              name="staffName"
              className="input"
              required
              maxLength={40}
              list="k-staff-names"
              autoComplete="off"
              defaultValue={expense?.staffName ?? ""}
              placeholder={t("kirana.staffNamePh")}
            />
            <datalist id="k-staff-names">
              {staffNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
        )}

        <label className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5">
          <input type="checkbox" checked={itemized} onChange={(e) => setItemized(e.target.checked)} className="size-5 accent-[var(--color-leaf)]" />
          <span className="text-[15px]">{t("kirana.addItems")}</span>
        </label>

        {itemized ? (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.key} className="rounded-xl border border-line bg-white p-2">
                <div className="flex gap-2">
                  <input
                    className="input min-w-0 flex-1"
                    aria-label={t("kirana.itemName")}
                    placeholder={t("kirana.itemNamePh")}
                    maxLength={60}
                    value={r.name}
                    autoFocus={i === rows.length - 1 && i > 0}
                    onChange={(e) => setRow(r.key, { name: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-ghost btn-sm shrink-0"
                    aria-label={t("kirana.removeItem")}
                    onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [blankRow()]))}
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_5.5rem_1.2fr] gap-2">
                  <input
                    className="input"
                    inputMode="decimal"
                    aria-label={t("kirana.qty")}
                    placeholder={t("kirana.qty")}
                    value={r.qty}
                    onChange={(e) => setRow(r.key, { qty: e.target.value.replace(/[^\d.]/g, "") })}
                  />
                  <select className="input px-2" aria-label={t("kirana.unit")} value={r.unit} onChange={(e) => setRow(r.key, { unit: e.target.value as ItemUnit })}>
                    {ITEM_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {t(`kirana.unit.${u}`)}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    inputMode="decimal"
                    aria-label={t("kirana.itemAmount")}
                    placeholder="₹"
                    value={r.amount}
                    onChange={(e) => setRow(r.key, { amount: e.target.value })}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => setRows((rs) => [...rs, blankRow()])} disabled={rows.length >= 50}>
                <Plus size={15} /> {t("kirana.addItem")}
              </button>
              <span className="text-sm">
                {t("kirana.itemsTotal")} <b className="font-display text-lg tabular-nums">{formatMoney(itemsTotal)}</b>
              </span>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {!itemized && (
            <div>
              <label htmlFor="k-amount" className="label">{t("common.amountRs")}</label>
              <input
                id="k-amount"
                name="amount"
                inputMode="decimal"
                className="input"
                required
                defaultValue={expense && !expense.items.length ? paiseToInput(expense.amount) : ""}
                placeholder="500"
              />
            </div>
          )}
          <div className={itemized ? "col-span-2" : ""}>
            <label htmlFor="k-date" className="label">{t("kirana.date")}</label>
            <input id="k-date" name="spentOn" type="date" className="input" required max={today} defaultValue={expense?.spentOn ?? today} />
          </div>
        </div>

        <div>
          <span className="label">{t("common.method")}</span>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={method === value}
                onClick={() => setMethod(value)}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition ${
                  method === value ? "border-leaf bg-leaf-soft text-leaf-dark" : "border-line bg-white text-ink"
                }`}
              >
                <Icon size={16} /> {t(`method.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="k-note" className="label">{t("kirana.note")}</label>
          <input id="k-note" name="note" className="input" maxLength={120} defaultValue={expense?.note ?? ""} placeholder={t("kirana.notePh")} />
        </div>

        {error && <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending && <LoaderCircle size={18} className="animate-spin" />} {t("kirana.save")}
        </button>
      </form>
    </Sheet>
  );
}
