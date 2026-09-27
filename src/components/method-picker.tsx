"use client";

import type { PaymentMethod } from "@prisma/client";
import { METHODS } from "@/components/ui";
import { useT } from "@/lib/i18n/client";

export function MethodPicker({ value, onChange, showLabel = true }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void; showLabel?: boolean }) {
  const t = useT();
  return (
    <div>
      {showLabel && <span className="label">{t("common.method")}</span>}
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("bill.paymentMethod")}>
        {METHODS.map(({ value: v, icon: Icon }) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`chip h-11 justify-center ${value === v ? "border-leaf bg-leaf-soft text-leaf-dark" : "border-line bg-white text-muted"}`}
          >
            <Icon size={17} /> {t(`method.${v}` as const)}
          </button>
        ))}
      </div>
    </div>
  );
}
