"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" className="btn-primary no-print w-full" onClick={() => window.print()}>
      <Printer size={18} /> {label}
    </button>
  );
}
