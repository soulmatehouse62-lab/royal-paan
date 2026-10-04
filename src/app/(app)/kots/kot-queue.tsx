"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, LoaderCircle, Printer } from "lucide-react";
import type { CounterKot } from "@/lib/table-orders";
import { deletePrintedKotAction } from "@/app/actions/tables";
import { KotTicket } from "@/components/kot-ticket";
import { Empty } from "@/components/ui";
import { sizeName } from "@/lib/categories";
import { formatAge } from "@/lib/time";
import { useLocale, useT } from "@/lib/i18n/client";

const REFRESH_MS = 8000;

/** Counter screen: KOTs saved by waiters wait here until someone prints them; printing removes them. */
export function KotQueue({ waiting }: { waiting: CounterKot[] }) {
  const router = useRouter();
  const t = useT();
  const [printing, setPrinting] = useState<CounterKot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Pick up new KOTs from the waiters.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  // Print once the chosen ticket is rendered, then delete the KOT.
  useEffect(() => {
    if (!printing) return;
    const id = requestAnimationFrame(() => {
      window.print();
      startTransition(async () => {
        const res = await deletePrintedKotAction(printing.id);
        if (!res.ok) setError(res.error);
        setPrinting(null);
        router.refresh();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [printing]);

  return (
    <>
      {printing && (
        <div className="hidden print:block">
          <KotTicket kot={printing} />
        </div>
      )}

      <div className="no-print space-y-6">
        {error && <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}

        <section>
          <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted">
            {t("kotq.waiting", { n: waiting.length })}
          </h2>
          {waiting.length === 0 ? (
            <Empty icon={<ChefHat />} title={t("kotq.none")}>
              {t("kotq.noneHint")}
            </Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {waiting.map((k) => (
                <KotCard key={k.id} kot={k}>
                  <button type="button" className="btn-accent h-12 w-full" disabled={pending} onClick={() => setPrinting(k)}>
                    {pending && printing?.id === k.id ? <LoaderCircle size={18} className="animate-spin" /> : <Printer size={18} />}
                    {t("kotq.print")}
                  </button>
                </KotCard>
              ))}
            </div>
          )}
        </section>

      </div>
    </>
  );
}

function KotCard({ kot, children }: { kot: CounterKot; children: React.ReactNode }) {
  const t = useT();
  const locale = useLocale();
  return (
    <article className={"card flex flex-col gap-2 border-t-4 border-t-warn p-3.5"}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xl font-semibold">{t("common.table", { n: kot.tableNumber })}</span>
        <span className="text-xs font-semibold text-muted">KOT #{String(kot.kotNumber).padStart(4, "0")}</span>
      </div>
      <p className="text-xs text-muted">
        {kot.staffName} · {formatAge(kot.printedAt, t)}
      </p>
      <ul className="flex-1 space-y-0.5 text-sm">
        {kot.items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-8 shrink-0 font-bold tabular-nums">{it.quantity} ×</span>
            <span className="min-w-0 font-medium">
              {it.name}
              {it.variantName && <span className="text-muted"> · {sizeName(it.variantName, locale)}</span>}
            </span>
          </li>
        ))}
      </ul>
      {children}
    </article>
  );
}
