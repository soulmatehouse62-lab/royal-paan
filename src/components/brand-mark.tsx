import Image from "next/image";

/** The round Royal Paan seal from /public/logo.png. */
export function BrandMark({ size = 40, priority = false }: { size?: number; priority?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className="shrink-0 rounded-full shadow-[0_0_0_2px_var(--color-rani)]"
    />
  );
}

export function BrandLockup({ short, tagline }: { short: string; tagline: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BrandMark size={44} priority />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-display text-lg font-semibold tracking-tight text-ink">{short}</span>
        <span className="block truncate text-[11px] font-medium uppercase tracking-[0.14em] text-leaf">{tagline}</span>
      </span>
    </span>
  );
}
