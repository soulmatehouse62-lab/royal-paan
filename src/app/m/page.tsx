import type { Metadata } from "next";
import { connection } from "next/server";
import { getMenu } from "@/lib/menu-data";
import { categoryLabel, categoryStyle, sizeName } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t("public.title")} · ${t("brand.name")}`, description: `${t("brand.name")}, ${t("brand.address")}` };
}

/**
 * Public, read-only menu. No sign-in. The data comes from the shared menu
 * cache (tag "menu"), which every menu change invalidates, so the page is
 * fast and still updates immediately. Dishes show both names when a Hindi
 * name is set, so every guest can read it.
 */
export default async function PublicMenu() {
  await connection(); // render per request (from cache) instead of at build time
  const [all, t] = await Promise.all([getMenu(), getT()]);
  const locale = t.locale;
  const menu = all.filter((m) => m.isAvailable);
  const groups = new Map<string, typeof menu>();
  for (const m of menu) groups.set(m.category, [...(groups.get(m.category) ?? []), m]);

  return (
    <main className="relative mx-auto min-h-dvh max-w-2xl px-4 pb-12">
      <LangToggle className="absolute right-4 top-4" />
      <header className="flex flex-col items-center py-8 text-center">
        <BrandMark size={56} />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-leaf-dark">{t("brand.name")}</h1>
        <p className="mt-1 text-sm text-muted">{t("brand.address")}</p>
      </header>

      {groups.size > 1 && (
        <nav className="no-scrollbar sticky top-0 z-10 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-cream/95 px-4 py-2 backdrop-blur" aria-label={t("picker.categories")}>
          {[...groups.keys()].map((c) => {
            const s = categoryStyle(c);
            return (
              <a key={c} href={`#${encodeURIComponent(c)}`} className="chip whitespace-nowrap border-transparent" style={{ background: s.soft, color: s.color }}>
                {categoryLabel(c, locale)}
              </a>
            );
          })}
        </nav>
      )}

      {menu.length === 0 ? (
        <p className="card px-4 py-10 text-center text-muted">{t("public.soon")}</p>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([category, items]) => {
            const s = categoryStyle(category);
            const Icon = s.icon;
            return (
              <section key={category} id={encodeURIComponent(category)} className="scroll-mt-16">
                <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold" style={{ color: s.color }}>
                  <span className="grid size-8 place-items-center rounded-lg" style={{ background: s.soft }}>
                    <Icon size={17} />
                  </span>
                  {categoryLabel(category, locale)}
                </h2>
                <ul className="card divide-y divide-line">
                  {items.map((m) => {
                    const [primary, secondary] = locale === "hi" && m.nameHi ? [m.nameHi, m.name] : [m.name, m.nameHi];
                    return (
                      <li key={m.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                        <span className="min-w-0">
                          <span className="block font-medium">{primary}</span>
                          {secondary && <span className="block text-xs text-muted">{secondary}</span>}
                        </span>
                        <span className="shrink-0 text-right font-semibold tabular-nums text-leaf-dark">
                          {m.variants.length
                            ? m.variants.map((v) => (
                                <span key={v.name} className="ml-3 inline-block">
                                  <span className="mr-1 text-xs font-medium text-muted">{sizeName(v.name, locale)}</span>
                                  {formatMoney(v.price)}
                                </span>
                              ))
                            : formatMoney(m.price)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="mt-8 text-center text-xs text-muted">{t("public.order")}</p>
    </main>
  );
}
