import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { BrandMark } from "@/components/brand-mark";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="card flex max-w-sm flex-col items-center p-8 text-center">
        <BrandMark size={52} />
        <p className="mt-4 font-display text-5xl font-semibold text-rani">404</p>
        <h1 className="mt-1 text-2xl font-semibold">{t("nf.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("nf.body")}</p>
        <Link href="/" className="btn-primary mt-6 w-full">{t("errp.home")}</Link>
      </div>
    </main>
  );
}
