import Image from "next/image";

const SIZES = { sm: 40, md: 64, lg: 96 } as const;

/** The logo seal with a bronze ring turning around it. */
export function Loader({ size = "md", label }: { size?: keyof typeof SIZES; label?: string }) {
  const px = SIZES[size];
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: px, height: px }}>
        <span className="absolute -inset-1.5 animate-spin rounded-full border-[3px] border-leaf/15 border-t-leaf [animation-duration:1.1s]" />
        <Image src="/logo.png" alt="" width={px} height={px} priority className="animate-pulse rounded-full [animation-duration:2s]" />
      </div>
      {label && <span className="text-sm font-medium text-muted">{label}</span>}
    </div>
  );
}
