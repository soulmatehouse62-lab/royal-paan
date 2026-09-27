"use client";

import { memo, useDeferredValue, useMemo, useState } from "react";
import { LayoutGrid, Search, X } from "lucide-react";
import { categoryLabel, categoryStyle, sizeName } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { sizeLabel } from "@/lib/pricing";
import { itemNames } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MenuEntry } from "@/lib/menu-data";

type Props = {
  menu: MenuEntry[];
  counts: Map<string, number>; // menuItemId → quantity in the bill
  onAdd: (item: MenuEntry, variantName: string | null) => void;
};

export function MenuPicker({ menu, counts, onAdd }: Props) {
  const t = useT();
  const locale = useLocale();
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const categories = useMemo(() => Array.from(new Set(menu.map((m) => m.category))), [menu]);
  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    // Search matches the English name, the Hindi name and the category in both languages.
    const hit = (m: MenuEntry) =>
      m.name.toLowerCase().includes(q) || (m.nameHi ?? "").includes(q) || categoryLabel(m.category, "hi").includes(q);
    return menu.filter((m) => (q ? hit(m) : !category || m.category === category));
  }, [menu, category, deferredQuery]);

  return (
    <section aria-label={t("nav.menu")} className="min-w-0">
      <div className="relative mb-3">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("picker.search")}
          className="input pl-10"
          aria-label={t("picker.search")}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-cream-deep" aria-label={t("picker.clearSearch")}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label={t("picker.categories")}>
        <CategoryTab active={!category && !query} onClick={() => { setCategory(null); setQuery(""); }} label={t("picker.all")} icon={<LayoutGrid size={16} />} color="#1e5631" soft="#e5f0e7" />
        {categories.map((c) => {
          const s = categoryStyle(c);
          const Icon = s.icon;
          return (
            <CategoryTab key={c} active={category === c && !query} onClick={() => { setCategory(c); setQuery(""); }} label={categoryLabel(c, locale)} icon={<Icon size={16} />} color={s.color} soft={s.soft} />
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="card px-4 py-10 text-center text-sm text-muted">{t("picker.noMatch", { q: deferredQuery })}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => (
            <MenuCard key={item.id} item={item} count={counts.get(item.id) ?? 0} onAdd={onAdd} />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryTab({ active, onClick, label, icon, color, soft }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode; color: string; soft: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="chip whitespace-nowrap"
      style={active ? { background: color, borderColor: color, color: "white" } : { background: soft, borderColor: "transparent", color }}
    >
      {icon}
      {label}
    </button>
  );
}

const MenuCard = memo(function MenuCard({ item, count, onAdd }: { item: MenuEntry; count: number; onAdd: Props["onAdd"] }) {
  const t = useT();
  const locale = useLocale();
  const s = categoryStyle(item.category);
  const Icon = s.icon;
  const hasSizes = item.variants.length > 0;
  const names = item.variants.map((v) => v.name);
  const n = itemNames(item, locale);

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: s.soft, color: s.color }}>
          <Icon size={18} />
        </span>
        {count > 0 && (
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-rani px-1.5 text-xs font-bold text-white">{count}</span>
        )}
      </div>
      <div className="mt-2 min-h-10">
        <div className="line-clamp-2 text-[15px] font-semibold leading-tight">{n.primary}</div>
        {n.secondary && <div className="truncate text-[11px] text-muted">{n.secondary}</div>}
      </div>
    </>
  );

  if (!hasSizes) {
    return (
      <button
        type="button"
        onClick={() => onAdd(item, null)}
        className={`card flex flex-col p-3 text-left transition active:scale-[0.97] hover:border-leaf/40 ${count ? "ring-2 ring-rani/30" : ""}`}
      >
        {body}
        <div className="mt-1 font-display text-lg font-semibold text-leaf-dark tabular-nums">{formatMoney(item.price)}</div>
      </button>
    );
  }

  return (
    <div className={`card flex flex-col p-3 ${count ? "ring-2 ring-rani/30" : ""}`}>
      {body}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.variants.map((v) => (
          <button
            key={v.name}
            type="button"
            onClick={() => onAdd(item, v.name)}
            aria-label={t("picker.addSize", { name: n.primary, size: sizeName(v.name, locale), price: formatMoney(v.price) })}
            className="flex h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-lg border border-line bg-white px-1.5 leading-none transition hover:border-leaf active:scale-95 active:bg-leaf-soft"
          >
            <span className="text-[11px] font-bold text-muted">{sizeLabel(v.name, names)}</span>
            <span className="mt-0.5 text-sm font-semibold tabular-nums">{formatMoney(v.price)}</span>
          </button>
        ))}
      </div>
    </div>
  );
});
