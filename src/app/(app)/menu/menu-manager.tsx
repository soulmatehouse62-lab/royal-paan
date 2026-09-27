"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Languages, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { suggestHindiName } from "@/lib/hindi-names";
import type { MenuEntry } from "@/lib/menu-data";
import { categoryLabel, categoryStyle, isDrinkCategory, sizeName } from "@/lib/categories";
import { useLocale, useT } from "@/lib/i18n/client";
import { itemNames } from "@/lib/i18n";
import { formatMoney, paiseToInput, parseRupees } from "@/lib/money";
import { deleteMenuItemAction, fillHindiNamesAction, saveMenuItemAction, setAvailabilityAction } from "@/app/actions/menu";
import { Sheet } from "@/components/sheet";
import { Empty } from "@/components/ui";

export function MenuManager({ menu, isAdmin }: { menu: MenuEntry[]; isAdmin: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [editing, setEditing] = useState<MenuEntry | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [items, setOptimistic] = useOptimistic(menu, (state, u: { id: string; isAvailable: boolean }) =>
    state.map((m) => (m.id === u.id ? { ...m, isAvailable: u.isAvailable } : m)),
  );
  const [, start] = useTransition();
  const categories = useMemo(() => Array.from(new Set(menu.map((m) => m.category))).sort(), [menu]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, MenuEntry[]>();
    for (const m of items) {
      const hit = m.name.toLowerCase().includes(q) || (m.nameHi ?? "").includes(q) || m.category.toLowerCase().includes(q) || categoryLabel(m.category, "hi").includes(q);
      if (q && !hit) continue;
      map.set(m.category, [...(map.get(m.category) ?? []), m]);
    }
    return [...map.entries()];
  }, [items, query]);

  function toggle(m: MenuEntry) {
    start(async () => {
      setOptimistic({ id: m.id, isAvailable: !m.isAvailable });
      const res = await setAvailabilityAction(m.id, !m.isAvailable);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("menu.search")} className="input pl-10" aria-label={t("menu.search")} />
        </div>
        {isAdmin && (
          <button type="button" className="btn-accent" onClick={() => setEditing("new")}>
            <Plus size={18} /> <span className="hidden sm:inline">{t("menu.add")}</span>
          </button>
        )}
      </div>

      {isAdmin && <FillHindiBanner missing={menu.filter((m) => !m.nameHi?.trim()).length} />}

      {menu.length === 0 ? (
        <Empty icon={<BookOpen />} title={t("menu.emptyTitle")}>
          {isAdmin ? t("menu.emptyAdmin") : t("menu.emptyStaff")}
        </Empty>
      ) : (
        <div className="space-y-5">
          {grouped.map(([category, list]) => {
            const s = categoryStyle(category);
            const Icon = s.icon;
            return (
              <section key={category}>
                <h2 className="mb-2 flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wide" style={{ color: s.color }}>
                  <span className="grid size-7 place-items-center rounded-lg" style={{ background: s.soft }}>
                    <Icon size={15} />
                  </span>
                  {categoryLabel(category, locale)} <span className="font-medium text-muted">· {list.length}</span>
                </h2>
                <ul className="card divide-y divide-line overflow-hidden">
                  {list.map((m) => {
                    const n = itemNames(m, locale);
                    return (
                    <li key={m.id} className={`flex items-center gap-3 px-4 py-3 ${m.isAvailable ? "" : "bg-cream/70"}`}>
                      <div className="min-w-0 flex-1">
                        <div className={`font-semibold ${m.isAvailable ? "" : "text-muted line-through decoration-1"}`}>
                          {n.primary}
                          {n.secondary && <span className="ml-1.5 text-xs font-normal text-muted">{n.secondary}</span>}
                        </div>
                        <div className="text-sm text-muted tabular-nums">
                          {m.variants.length ? m.variants.map((v) => `${sizeName(v.name, locale)} ${formatMoney(v.price)}`).join(" · ") : formatMoney(m.price)}
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
                        <span className="hidden sm:inline">{m.isAvailable ? t("menu.available") : t("menu.off")}</span>
                        <input type="checkbox" className="peer sr-only" checked={m.isAvailable} onChange={() => toggle(m)} aria-label={t("menu.availableAria", { name: n.primary })} />
                        <span className="relative h-7 w-12 rounded-full bg-line transition peer-checked:bg-leaf peer-focus-visible:outline-2 peer-focus-visible:outline-leaf after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                      </label>
                      {isAdmin && (
                        <button type="button" className="grid size-10 place-items-center rounded-full text-muted hover:bg-cream-deep hover:text-ink" onClick={() => setEditing(m)} aria-label={t("menu.editAria", { name: n.primary })}>
                          <Pencil size={17} />
                        </button>
                      )}
                    </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {grouped.length === 0 && <p className="card px-4 py-10 text-center text-sm text-muted">{t("menu.noMatch", { q: query })}</p>}
        </div>
      )}

      {editing && (
        <ItemSheet key={editing === "new" ? "new" : editing.id} item={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

type SizeRow = { name: string; price: string };
const DEFAULT_SIZES: SizeRow[] = [
  { name: "Medium", price: "" },
  { name: "Large", price: "" },
];

function ItemSheet({ item, categories, onClose }: { item: MenuEntry | null; categories: string[]; onClose: () => void }) {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState(item?.name ?? "");
  const [nameHi, setNameHi] = useState(item?.nameHi ?? "");
  const suggestion = useMemo(() => suggestHindiName(name), [name]);
  const [category, setCategory] = useState(item?.category ?? "");
  const [price, setPrice] = useState(item && !item.variants.length ? paiseToInput(item.price) : "");
  const [hasSizes, setHasSizes] = useState(Boolean(item?.variants.length));
  const [sizesTouched, setSizesTouched] = useState(Boolean(item));
  const [sizes, setSizes] = useState<SizeRow[]>(item?.variants.length ? item.variants.map((v) => ({ name: v.name, price: paiseToInput(v.price) })) : DEFAULT_SIZES);
  const [available, setAvailable] = useState(item?.isAvailable ?? true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();

  function onCategory(v: string) {
    setCategory(v);
    // Sizes switch on by themselves for drinks, unless staff chose otherwise.
    if (!sizesTouched && isDrinkCategory(v)) setHasSizes(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let variants: { name: string; price: number }[] = [];
    let single: number | undefined;
    if (hasSizes) {
      for (const s of sizes) {
        const p = parseRupees(s.price);
        if (!s.name.trim()) return setError(t("err.sizeName"));
        if (p === null) return setError(t("err.sizePrice", { name: s.name }));
        variants.push({ name: s.name.trim(), price: p });
      }
    } else {
      const p = parseRupees(price);
      if (p === null) return setError(t("err.validPrice"));
      single = p;
      variants = [];
    }
    start(async () => {
      const res = await saveMenuItemAction({ id: item?.id ?? null, name, nameHi, category, price: single, variants, isAvailable: available });
      if (!res.ok) return setError(res.error);
      onClose();
      router.refresh();
    });
  }

  function remove() {
    if (!item) return;
    start(async () => {
      const res = await deleteMenuItemAction(item.id);
      if (!res.ok) return setError(res.error);
      onClose();
      router.refresh();
    });
  }

  return (
    <Sheet open onClose={onClose} title={item ? t("menu.editItem") : t("menu.add")}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label htmlFor="m-name" className="label">{t("menu.name")}</label>
          <input id="m-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus={!item} />
        </div>
        <div>
          <label htmlFor="m-name-hi" className="label">{t("menu.nameHi")}</label>
          <input id="m-name-hi" className="input" lang="hi" value={nameHi} onChange={(e) => setNameHi(e.target.value)} maxLength={80} placeholder={suggestion ?? "जैसे पनीर बटर मसाला"} />
          {suggestion && suggestion !== nameHi.trim() && (
            <button type="button" className="chip mt-2 h-9 border-leaf/30 bg-leaf-soft text-leaf-dark" onClick={() => setNameHi(suggestion)}>
              {t("menu.suggest", { s: suggestion })} · <b>{t("menu.useSuggestion")}</b>
            </button>
          )}
        </div>
        <div>
          <label htmlFor="m-cat" className="label">{t("menu.category")}</label>
          <input id="m-cat" className="input" list="m-cats" value={category} onChange={(e) => onCategory(e.target.value)} maxLength={40} required placeholder={t("menu.categoryPh")} />
          <datalist id="m-cats">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
          <span>
            <span className="block font-semibold">{t("menu.sizes")}</span>
            <span className="block text-xs text-muted">{t("menu.sizesHint")}</span>
          </span>
          <input
            type="checkbox"
            className="size-5 accent-leaf"
            checked={hasSizes}
            onChange={(e) => {
              setHasSizes(e.target.checked);
              setSizesTouched(true);
            }}
          />
        </label>

        {hasSizes ? (
          <div className="space-y-2">
            {sizes.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-1" value={s.name} placeholder={t("menu.size")} aria-label={t("menu.sizeNameAria", { n: i + 1 })} maxLength={30} onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input className="input w-28" value={s.price} placeholder="₹" inputMode="decimal" aria-label={t("menu.sizePriceAria", { n: i + 1 })} onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/[^\d.]/g, "") } : x)))} />
                <button type="button" className="grid size-12 shrink-0 place-items-center rounded-xl text-muted hover:bg-cream-deep disabled:opacity-30" disabled={sizes.length <= 2} onClick={() => setSizes(sizes.filter((_, j) => j !== i))} aria-label={t("menu.removeSize")}>
                  <X size={18} />
                </button>
              </div>
            ))}
            {sizes.length < 6 && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => setSizes([...sizes, { name: "", price: "" }])}>
                <Plus size={16} /> {t("menu.addSize")}
              </button>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="m-price" className="label">{t("menu.price")}</label>
            <input id="m-price" className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
          </div>
        )}

        <label className="flex items-center gap-3">
          <input type="checkbox" className="size-5 accent-leaf" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          <span className="font-medium">{t("menu.availableToOrder")}</span>
        </label>

        {error && <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}

        <button className="btn-primary h-14 w-full text-base" disabled={pending}>
          {pending && <LoaderCircle size={18} className="animate-spin" />}
          {item ? t("menu.saveChanges") : t("menu.addToMenu")}
        </button>

        {item &&
          (confirmDelete ? (
            <div className="rounded-xl bg-danger-soft p-3 text-sm">
              <p className="mb-2 text-danger">{t("menu.deleteQ", { name: item.name })}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>{t("common.keep")}</button>
                <button type="button" className="btn btn-sm bg-danger text-white" onClick={remove} disabled={pending}>{t("common.delete")}</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-danger w-full" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={17} /> {t("menu.deleteItem")}
            </button>
          ))}
      </form>
    </Sheet>
  );
}

/** Admin helper: fill in Hindi names for every item that has none. */
function FillHindiBanner({ missing }: { missing: number }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ filled: number; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (missing === 0 && !result) return null;

  return (
    <section className="mb-4 rounded-card border border-leaf/25 bg-leaf-soft/60 p-4">
      {missing > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-leaf-dark">
            <Languages size={18} /> {t("menu.missingHi", { n: missing })}
          </p>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await fillHindiNamesAction();
                if (!res.ok) return setError(res.error);
                setResult(res.data);
                router.refresh();
              })
            }
          >
            {pending && <LoaderCircle size={16} className="animate-spin" />}
            {t("menu.fillHi")}
          </button>
        </div>
      )}
      {result && (
        <div className="mt-2 space-y-1 text-sm">
          {result.filled > 0 && <p className="font-medium text-ok">{t("menu.filledHi", { n: result.filled })}</p>}
          {result.skipped.length > 0 && <p className="text-warn">{t("menu.skippedHi", { names: result.skipped.join(", ") })}</p>}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-medium text-danger">{error}</p>}
    </section>
  );
}
