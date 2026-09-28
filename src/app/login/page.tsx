import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNextPath } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { BrandMark } from "@/components/brand-mark";
import { LangToggle } from "@/components/lang-toggle";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("login.title") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next);
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);
  if (user) redirect(safeNext);

  return (
    <main className="relative grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,#3a2a17,var(--color-rani)_65%)] px-4 py-10">
      <LangToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size={128} priority />
          <h1 className="sr-only">{t("brand.name")}</h1>
          <p className="mt-4 text-sm font-medium uppercase tracking-[0.16em] text-gold">{t("brand.tagline")}</p>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 text-xl font-semibold">{t("login.title")}</h2>
          <LoginForm next={safeNext} />
        </div>
        <p className="mt-5 text-center text-xs text-white/60">{t("login.forgot")}</p>
      </div>
    </main>
  );
}
