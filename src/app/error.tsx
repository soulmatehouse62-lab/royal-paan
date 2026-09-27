"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[70dvh] place-items-center px-4">
      <div className="card flex max-w-sm flex-col items-center p-8 text-center">
        <p className="font-display text-4xl font-semibold text-rani">{t("errp.oops")}</p>
        <h1 className="mt-2 text-xl font-semibold">{t("errp.title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("errp.body")}</p>
        {error.digest && <p className="mt-1 text-xs text-muted">{t("errp.code", { c: error.digest })}</p>}
        <div className="mt-6 grid w-full gap-2">
          <button type="button" className="btn-primary" onClick={reset}>
            <RotateCcw size={18} /> {t("errp.retry")}
          </button>
          <Link href="/" className="btn-ghost">{t("errp.home")}</Link>
        </div>
      </div>
    </main>
  );
}
