"use client";

import { useState } from "react";
import { LoaderCircle, Printer } from "lucide-react";
import { sendToPrinter, type PrintJobType } from "@/lib/printClient";

const SAMPLE_KOT = {
  kotNo: 14,
  table: 2,
  staff: "Admin",
  items: [
    { qty: 1, name: "Mango Lassi", variant: "Large" },
    { qty: 2, name: "Paneer Butter Masala", note: "Kam teekha" },
  ],
};

const SAMPLE_BILL = {
  billNo: 31,
  table: 2,
  staff: "Admin",
  paymentMode: "UPI",
  items: [
    { qty: 1, name: "Mango Lassi", variant: "Large", price: 120 },
    { qty: 2, name: "Paneer Butter Masala", price: 260 },
  ],
  taxes: [
    { label: "CGST 2.5%", amount: 16 },
    { label: "SGST 2.5%", amount: 16 },
  ],
};

const BUTTONS: { label: string; name: string; type: PrintJobType; data: Record<string, unknown> }[] = [
  { label: "Test Slip", name: "Test slip", type: "test", data: {} },
  { label: "Sample KOT", name: "KOT", type: "kot", data: SAMPLE_KOT },
  { label: "Sample Bill", name: "Bill", type: "bill", data: SAMPLE_BILL },
];

export default function PrintTestPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const add = (line: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString("en-IN")}  ${line}`, ...prev].slice(0, 50));

  async function print(b: (typeof BUTTONS)[number]) {
    setBusy(b.label);
    add(`➡️ ${b.name} bheja...`);
    try {
      const result = await sendToPrinter(b.type, { ...b.data, createdAt: Date.now() });
      add(result === "done" ? `✅ ${b.name} print ho gaya` : `⏳ ${b.name} queue mein hai – agent chalu hai?`);
    } catch (e) {
      add(`❌ ${b.name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Printer size={24} /> Printer Test
      </h1>
      <p className="text-sm text-muted">
        Button dabao – ticket shop ke printer par chhapega. Shop laptop par print agent chalu hona chahiye.
      </p>

      <div className="space-y-2.5">
        {BUTTONS.map((b) => (
          <button
            key={b.label}
            type="button"
            className="btn-primary h-14 w-full text-base"
            disabled={busy !== null}
            onClick={() => print(b)}
          >
            {busy === b.label && <LoaderCircle size={18} className="animate-spin" />} {b.label}
          </button>
        ))}
      </div>

      <div className="card min-h-40 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Log</p>
        {log.length === 0 ? (
          <p className="text-sm text-muted">Abhi kuch nahi.</p>
        ) : (
          <ul className="space-y-1 font-mono text-sm">
            {log.map((line, i) => (
              <li key={i} className="break-words">
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
