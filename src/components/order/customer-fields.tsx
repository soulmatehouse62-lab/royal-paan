"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TriangleAlert, UserRound } from "lucide-react";
import type { CustomerLookup, CustomerMatch } from "@/app/api/customers/route";
import { formatMoney } from "@/lib/money";
import { digitsOnly } from "@/lib/phone";
import { useT } from "@/lib/i18n/client";

type Props = {
  phone: string;
  name: string;
  table: string;
  onPhone: (v: string) => void;
  onName: (v: string) => void;
  onTable: (v: string) => void;
  showTable?: boolean;
};

type Field = "phone" | "name";

/**
 * Phone + name with returning-customer lookup:
 * - a full 10-digit phone we know fills in the name and warns about unpaid dues;
 * - part of a name (any word) or the first 3+ digits of a phone lists regulars.
 */
export function CustomerFields({ phone, name, table, onPhone, onName, onTable, showTable = true }: Props) {
  const t = useT();
  const [matches, setMatches] = useState<CustomerMatch[]>([]);
  const [openFor, setOpenFor] = useState<Field | null>(null);
  const [active, setActive] = useState(0);
  const [exact, setExact] = useState<CustomerLookup["exact"]>(null);
  const nameAutoFilled = useRef(false);
  const lastQuery = useRef<{ field: Field; q: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function lookup(field: Field, q: string, delay = 180) {
    if (timer.current) clearTimeout(timer.current);
    const trimmed = q.trim();
    const tooShort = field === "phone" ? digitsOnly(trimmed).length < 3 : trimmed.length < 2;
    if (tooShort) {
      abort.current?.abort();
      setMatches([]);
      if (field === "phone") setExact(null);
      return;
    }
    lastQuery.current = { field, q: trimmed };
    timer.current = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as CustomerLookup;
        setMatches(data.matches);
        setActive(0);
        if (field === "phone") {
          setExact(data.exact);
          // Fill in the name of a known number, unless staff typed one themselves.
          if (data.exact?.name && (!name.trim() || nameAutoFilled.current)) {
            onName(data.exact.name);
            nameAutoFilled.current = true;
          }
          // A known full number needs no dropdown.
          if (data.exact) setOpenFor(null);
        }
      } catch {
        /* aborted or offline: ignore */
      }
    }, delay);
  }

  useEffect(() => () => abort.current?.abort(), []);

  // Clear the dues warning whenever the number stops being a full match.
  useEffect(() => {
    if (exact && digitsOnly(phone).slice(-10) !== exact.phoneKey) setExact(null);
  }, [phone, exact]);

  function pick(m: CustomerMatch) {
    onPhone(m.phone);
    if (m.name) {
      onName(m.name);
      nameAutoFilled.current = true;
    }
    setOpenFor(null);
    setMatches([]);
    lookup("phone", m.phone, 0);
  }

  function onKeyDown(e: React.KeyboardEvent, field: Field) {
    if (openFor !== field || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setOpenFor(null);
    }
  }

  const list = (field: Field) =>
    openFor === field && matches.length > 0 ? (
      <ul role="listbox" id={`${field}-suggestions`} className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-float">
        {matches.map((m, i) => (
          <li key={m.phoneKey} role="option" aria-selected={i === active}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()} // keep focus so blur doesn't close first
              onClick={() => pick(m)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${i === active ? "bg-leaf-soft" : ""}`}
            >
              <UserRound size={16} className="text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{m.name || t("cust.noName")}</span>
                <span className="block text-xs text-muted">{m.phone}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative">
          <label htmlFor="c-phone" className="label">{t("cust.phone")}</label>
          <input
            id="c-phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="98290 12345"
            value={phone}
            role="combobox"
            aria-expanded={openFor === "phone" && matches.length > 0}
            aria-controls="phone-suggestions"
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d+\s-]/g, "");
              onPhone(v);
              setOpenFor("phone");
              lookup("phone", v);
            }}
            onKeyDown={(e) => onKeyDown(e, "phone")}
            onBlur={() => setOpenFor(null)}
          />
          {list("phone")}
        </div>
        <div className="relative">
          <label htmlFor="c-name" className="label">{t("cust.name")}</label>
          <input
            id="c-name"
            className="input"
            autoComplete="off"
            placeholder={t("cust.namePh")}
            value={name}
            role="combobox"
            aria-expanded={openFor === "name" && matches.length > 0}
            aria-controls="name-suggestions"
            onChange={(e) => {
              onName(e.target.value);
              nameAutoFilled.current = false;
              setOpenFor("name");
              lookup("name", e.target.value);
            }}
            onKeyDown={(e) => onKeyDown(e, "name")}
            onBlur={() => setOpenFor(null)}
          />
          {list("name")}
        </div>
      </div>

      {exact && exact.dueTotal > 0 && (
        <div role="status" className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1 font-medium">
            {t("cust.owes", { name: exact.name || t("cust.thisCustomer"), amount: formatMoney(exact.dueTotal), n: exact.dueCount })}
          </div>
          <Link href={`/dues?phone=${exact.phoneKey}`} className="shrink-0 font-semibold underline underline-offset-2">
            {t("common.collect")}
          </Link>
        </div>
      )}

      {showTable && (
        <div className="w-40">
          <label htmlFor="c-table" className="label">{t("cust.table")}</label>
          <input id="c-table" className="input" inputMode="numeric" maxLength={10} value={table} onChange={(e) => onTable(e.target.value)} placeholder="—" />
        </div>
      )}
    </div>
  );
}
