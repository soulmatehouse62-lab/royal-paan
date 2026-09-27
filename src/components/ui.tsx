import type { PaymentMethod } from "@prisma/client";
import { Banknote, CreditCard, Smartphone } from "lucide-react";

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-leaf-dark md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Labels come from t(`method.${value}`). */
export const METHODS: { value: PaymentMethod; icon: typeof Banknote }[] = [
  { value: "CASH", icon: Banknote },
  { value: "UPI", icon: Smartphone },
  { value: "CARD", icon: CreditCard },
];

export function Empty({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-leaf-soft text-leaf">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, tone = "leaf", hint }: { label: string; value: string; tone?: "leaf" | "rani" | "gold" | "danger"; hint?: string }) {
  const tones = {
    leaf: "bg-leaf-soft text-leaf-dark",
    rani: "bg-rani-soft text-rani-dark",
    gold: "bg-gold-soft text-[#7a5510]",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <div className={`rounded-2xl px-4 py-3 ${tones[tone]}`}>
      <div className="text-[12px] font-semibold uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs opacity-75">{hint}</div>}
    </div>
  );
}
