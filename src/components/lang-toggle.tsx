"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/app/actions/locale";
import { useLocale, useT } from "@/lib/i18n/client";

/** One tap switches हिंदी ⇄ English. Remembered on this device. */
export function LangToggle({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={t("lang.switchAria")}
      title={t("lang.switchAria")}
      onClick={() =>
        start(async () => {
          await setLocaleAction(locale === "hi" ? "en" : "hi");
          router.refresh();
        })
      }
      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-sm font-bold text-leaf-dark transition hover:bg-cream-deep disabled:opacity-60 ${className}`}
    >
      <Languages size={17} />
      {t("lang.switchTo")}
    </button>
  );
}

/** Two big buttons, for the Account page. */
export function LangChooser() {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const choose = (l: "hi" | "en") =>
    start(async () => {
      await setLocaleAction(l);
      router.refresh();
    });
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup">
      {(
        [
          ["hi", "हिंदी"],
          ["en", "English"],
        ] as const
      ).map(([l, label]) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          disabled={pending}
          onClick={() => choose(l)}
          className={`chip h-12 justify-center text-base ${locale === l ? "border-leaf bg-leaf text-white" : "border-line bg-white text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
