import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { BrandLockup } from "@/components/brand-mark";
import { AccountLink, BottomNav, PillNav } from "@/components/nav";
import { LangToggle } from "@/components/lang-toggle";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-line/70 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <Link href="/" aria-label={t("nav.home")} className="min-w-0">
            <BrandLockup short={t("brand.short")} tagline={t("brand.tagline")} />
          </Link>
          <PillNav />
          <div className="flex shrink-0 items-center gap-2">
            <LangToggle />
            <AccountLink name={user.name} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-5 md:pb-12">{children}</main>
      <BottomNav />
    </>
  );
}
