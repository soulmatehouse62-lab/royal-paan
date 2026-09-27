"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChartColumn, History, Plus, ReceiptText, UserRound, Grid3x3 } from "lucide-react";
import { useT } from "@/lib/i18n/client";

const ITEMS = [
  { href: "/", label: "nav.newOrder", icon: Plus },
  { href: "/tables", label: "nav.tables", icon: Grid3x3 },
  { href: "/dues", label: "nav.dues", icon: ReceiptText },
  { href: "/history", label: "nav.history", icon: History },
  { href: "/analytics", label: "nav.analytics", icon: ChartColumn },
  { href: "/menu", label: "nav.menu", icon: BookOpen },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/history") return pathname.startsWith("/history") || pathname.startsWith("/orders");
  return pathname === href || pathname.startsWith(href + "/");
}

/** Desktop: pill nav in the header. */
export function PillNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav className="hidden items-center gap-1 rounded-full border border-line bg-white/70 p-1 md:flex" aria-label={t("nav.main")}>
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition lg:px-4 ${
              active ? "bg-leaf text-white shadow-sm" : "text-muted hover:bg-cream-deep hover:text-ink"
            }`}
          >
            <Icon size={16} strokeWidth={2.4} />
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}

export function AccountLink({ name }: { name: string }) {
  const pathname = usePathname();
  const t = useT();
  const active = pathname.startsWith("/account") || pathname.startsWith("/users");
  return (
    <Link
      href="/account"
      aria-label={t("nav.account", { name })}
      className={`flex h-11 shrink-0 items-center gap-2 rounded-full border pl-1.5 pr-1.5 text-sm font-semibold transition lg:pr-3.5 ${
        active ? "border-leaf bg-leaf-soft text-leaf-dark" : "border-line bg-white text-ink hover:bg-cream-deep"
      }`}
    >
      <span className="grid size-8 place-items-center rounded-full bg-rani-soft text-rani">
        <UserRound size={17} strokeWidth={2.4} />
      </span>
      <span className="hidden max-w-28 truncate lg:inline">{name.split(" ")[0]}</span>
    </Link>
  );
}

/** Mobile: floating bottom bar with a prominent central New order button. */
export function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const [newOrder, ...rest] = ITEMS;
  const left = rest.slice(0, 2);
  const right = rest.slice(2);
  const tab = ({ href, label, icon: Icon }: (typeof ITEMS)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold leading-tight transition ${
          active ? "text-leaf" : "text-muted"
        }`}
      >
        <Icon size={21} strokeWidth={active ? 2.6 : 2.1} />
        <span className="max-w-full truncate">{t(label)}</span>
      </Link>
    );
  };
  const newActive = isActive(pathname, newOrder.href);
  return (
    <nav aria-label={t("nav.main")} className="no-print fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden">
      <div className="flex items-center rounded-3xl border border-line/80 bg-card/95 px-1.5 shadow-float backdrop-blur">
        {left.map(tab)}
        <Link
          href="/"
          aria-label={t("nav.newOrder")}
          aria-current={newActive ? "page" : undefined}
          className="-mt-7 mx-1 grid size-16 shrink-0 place-items-center rounded-full bg-rani text-white shadow-float ring-4 ring-cream transition active:scale-95"
        >
          <Plus size={30} strokeWidth={2.6} />
        </Link>
        {right.map(tab)}
      </div>
    </nav>
  );
}
