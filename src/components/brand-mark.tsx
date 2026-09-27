/** A paan leaf in a green tile, echoing the leaf on the shop's signboard. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="18" fill="#1e5631" />
      <path d="M32 53C20 45 12.5 35.5 12.5 26.5c0-7 5-12.5 11.5-12.5 4 0 6.8 2 8 5 1.2-3 4-5 8-5 6.5 0 11.5 5.5 11.5 12.5 0 9-7.5 18.5-19.5 26.5z" fill="#79c37d" />
      <path d="M32 21v29M32 29l-7-5M32 29l7-5M32 38l-9-6M32 38l9-6" stroke="#133b21" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <circle cx="49" cy="14" r="5" fill="#b0156c" />
    </svg>
  );
}

export function BrandLockup({ short, tagline }: { short: string; tagline: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <BrandMark />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-display text-lg font-semibold tracking-tight text-leaf-dark">{short}</span>
        <span className="block truncate text-[11px] font-medium uppercase tracking-[0.14em] text-rani">{tagline}</span>
      </span>
    </span>
  );
}
