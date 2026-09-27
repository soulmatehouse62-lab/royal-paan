"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/client";

/** Bottom sheet on mobile, centred dialog on desktop. Built on <dialog> for focus and Esc handling. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet no-print"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // tap on the backdrop
      }}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 pb-3 pt-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-cream-deep" aria-label={t("common.close")}>
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
