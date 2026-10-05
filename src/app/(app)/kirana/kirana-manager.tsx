"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, HandCoins, LoaderCircle, Pencil, Plus, ShoppingBasket, Trash2, Wallet } from "lucide-react";
import type { ExpenseCategory, PaymentMethod } from "@prisma/client";
import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { useLocale, useT } from "@/lib/i18n/client";
import { formatMoney, paiseToInput } from "@/lib/money";
import { formatYmdShort } from "@/lib/time";
import { Sheet } from "@/components/sheet";
import { METHODS } from "@/components/ui";

type Ex = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  note: string | null;
  method: PaymentMethod;
  spentOn: string;
  staffId: string | null;
  staffName: string | null;
};
type Staff = { id: string; name: string };

const CATEGORIES: { value: ExpenseCategory; icon: typeof Flame; tone: string }[] = [
  { value: "RATION", icon: ShoppingBasket, tone: "bg-leaf-soft text-leaf" },
  { value: "GAS", icon: Flame, tone: "bg-gold-soft text-gold" },
  { value: "STAFF_ADVANCE", icon: HandCoins, tone: "bg-rani-soft text-rani" },
  { value: "OTHER", icon: Wallet, tone: "bg-cream-deep text-muted" },
];
const catOf = (c: ExpenseCategory) => CATEGORIES.find((x) => x.value === c)!;

export function KiranaManager({ expenses, staff, today }: { expenses: Ex[]; staff: Staff[]; today: string }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  // null = closed, "new" = add form, otherwise the entry being edited.
  const [editing, setEditing] = useState<Ex | "new" | null>(null);
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
              return (
                <li key={ex.id} className="card flex items-center gap-3 p-3">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {t(`kirana.cat.${ex.category}`)}
                      {ex.staffName && <span className="font-normal"> · {ex.staffName}</span>}
                    </div>
                    <div className="truncate text-sm text-muted">
                      {t(`method.${ex.method}`)}
                      {ex.note && ` · ${ex.note}`}
                    </div>
                  </div>
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
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {editing && (
        <ExpenseSheet
          expense={editing === "new" ? null : editing}
          staff={staff}
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

function ExpenseSheet({
  expense,
  staff,
  today,
  onClose,
  onSaved,
}: {
  expense: Ex | null;
  staff: Staff[];
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "RATION");
  const [method, setMethod] = useState<PaymentMethod>(expense?.method ?? "CASH");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Keep a staff member who was later disabled selectable when editing their advance.
  const staffOptions =
    expense?.staffId && !staff.some((s) => s.id === expense.staffId)
      ? [...staff, { id: expense.staffId, name: expense.staffName ?? "" }]
      : staff;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input = {
      category,
      method,
      amount: String(f.get("amount") ?? ""),
      spentOn: String(f.get("spentOn") ?? ""),
      note: String(f.get("note") ?? "") || null,
      staffId: category === "STAFF_ADVANCE" ? String(f.get("staffId") ?? "") || null : null,
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
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
                className={`flex h-12 items-center gap-2 rounded-xl border px-3 text-[15px] font-semibold transition ${
                  category === value ? "border-leaf bg-leaf-soft text-leaf-dark" : "border-line bg-white text-ink"
                }`}
              >
                <Icon size={18} /> {t(`kirana.cat.${value}`)}
              </button>
            ))}
          </div>
        </div>

        {category === "STAFF_ADVANCE" && (
          <div>
            <label htmlFor="k-staff" className="label">{t("kirana.staff")}</label>
            <select id="k-staff" name="staffId" className="input" required defaultValue={expense?.staffId ?? ""}>
              <option value="" disabled>
                {t("kirana.pickStaff")}
              </option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="k-amount" className="label">{t("common.amountRs")}</label>
            <input
              id="k-amount"
              name="amount"
              inputMode="decimal"
              className="input"
              required
              autoFocus
              defaultValue={expense ? paiseToInput(expense.amount) : ""}
              placeholder="500"
            />
          </div>
          <div>
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
