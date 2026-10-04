"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat, ChevronDown, LayoutGrid, LoaderCircle, Lock, Minus, Plus, Printer, ReceiptText, ShoppingBag, Trash2 } from "lucide-react";
import type { DiscountType, OrderStatus, PaymentMethod } from "@prisma/client";
import type { MenuEntry } from "@/lib/menu-data";
import type { KotTicketView, SentLine } from "@/lib/table-orders";
import { formatMoney, parseRupees } from "@/lib/money";
import { discountAmount, discountOverLimit } from "@/lib/pricing";
import { createOrderAction, updateOrderAction } from "@/app/actions/orders";
import { sendKotAction, settleTableAction } from "@/app/actions/tables";
import { MethodPicker } from "@/components/method-picker";
import { Receipt, type ReceiptView } from "@/components/receipt";
import { KotTicket } from "@/components/kot-ticket";
import { useLocale, useT } from "@/lib/i18n/client";
import { itemNames } from "@/lib/i18n";
import { sizeName } from "@/lib/categories";
import { MenuPicker } from "./menu-picker";
import { CustomerFields } from "./customer-fields";

export type BillLine = {
  key: string;
  lineId?: string; // set for lines already saved on the order (edit mode)
  menuItemId: string | null;
  name: string;
  nameHi: string | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
};

export type EditInitial = {
  orderId: string;
  lines: BillLine[];
  customerName: string;
  customerPhone: string;
  tableNumber: string;
  discountType: DiscountType | null;
  discountValue: number | null;
  amountPaid: number;
};

type Props = {
  menu: MenuEntry[];
  edit?: EditInitial;
  /** Table chosen in the table picker (null = takeaway). Undefined shows the free-text table field. */
  fixedTable?: string | null;
  /** Items already sent to the kitchen for this table. */
  initialSent?: SentLine[];
  onChangeTable?: () => void;
  /** Highest discount this user may give, as % of the subtotal (the server checks it too). */
  maxDiscountPct: number;
};

export function OrderBuilder({ menu, edit, fixedTable, initialSent, onChangeTable, maxDiscountPct }: Props) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  // Dine-in: new items go to the kitchen as KOTs; the bill is made from everything sent.
  const dineIn = typeof fixedTable === "string";
  const [lines, setLines] = useState<BillLine[]>(edit?.lines ?? []);
  const [sent, setSent] = useState<SentLine[]>(initialSent ?? []);
  const [kot, setKot] = useState<KotTicketView | null>(null);
  const [phone, setPhone] = useState(edit?.customerPhone ?? "");
  const [name, setName] = useState(edit?.customerName ?? "");
  const [table, setTable] = useState(edit?.tableNumber ?? fixedTable ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(edit?.discountType ?? "FLAT");
  const [discountInput, setDiscountInput] = useState(edit?.discountValue ? String(edit.discountValue) : "");
  const [status, setStatus] = useState<OrderStatus>("PAID");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [partial, setPartial] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<(ReceiptView & { id: string }) | null>(null);
  // Which ticket the saved-order screen sends to the printer; a new object re-triggers printing.
  const [printing, setPrinting] = useState<{ what: "bill" | "kot" } | null>(null);
  // Takeaway: a kitchen ticket for the unsaved bill, printed from the order screen.
  const [draftKot, setDraftKot] = useState<(KotTicketView & { sig: string }) | null>(null);
  const [pending, startTransition] = useTransition();

  const add = useCallback((item: MenuEntry, variantName: string | null) => {
    setError(null);
    setLines((prev) => {
      // Prefer an existing line (kept at its original price) for the same item and size.
      const i = prev.findIndex((l) => l.menuItemId === item.id && l.variantName === variantName);
      if (i >= 0) return prev.map((l, j) => (j === i ? { ...l, quantity: Math.min(999, l.quantity + 1) } : l));
      const price = variantName ? item.variants.find((v) => v.name === variantName)!.price : item.price;
      return [...prev, { key: `${item.id}|${variantName ?? ""}`, menuItemId: item.id, name: item.name, nameHi: item.nameHi, variantName, unitPrice: price, quantity: 1 }];
    });
  }, []);

  const setQty = (key: string, qty: number) =>
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(999, qty) } : l))));

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) if (l.menuItemId) m.set(l.menuItemId, (m.get(l.menuItemId) ?? 0) + l.quantity);
    return m;
  }, [lines]);

  const sentSubtotal = sent.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const newSubtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const subtotal = sentSubtotal + newSubtotal;
  const discountValue = Number(discountInput) || 0;
  const discount = discountInput.trim() ? { type: discountType, value: discountValue } : null;
  const discountPaise = discountAmount(subtotal, discount);
  const total = subtotal - discountPaise;
  const newCount = lines.reduce((s, l) => s + l.quantity, 0);
  const itemCount = newCount + sent.reduce((s, l) => s + l.quantity, 0);
  const partialPaise = parseRupees(partial);
  const cashPaise = parseRupees(cashGiven);
  const change = cashPaise !== null && cashPaise >= total ? cashPaise - total : null;

  function reset() {
    setLines([]);
    setPhone("");
    setName("");
    setTable("");
    setDiscountInput("");
    setDiscountType("FLAT");
    setStatus("PAID");
    setMethod("CASH");
    setPartial("");
    setCashGiven("");
    setError(null);
    setSaved(null);
    setPrinting(null);
    setDraftKot(null);
    window.scrollTo({ top: 0 });
    onChangeTable?.();
  }

  function validate(): string | null {
    if (kotPending) return t("kot.printFirst");
    if (dineIn) {
      if (lines.length > 0) return t("kot.sendFirst");
      if (sent.length === 0) return t("err.addItem");
    } else if (lines.length === 0) return t("err.addItem");
    if (discountInput.trim() && (!(discountValue >= 0) || Number.isNaN(Number(discountInput)))) return t("bill.validDiscount");
    if (discountType === "PERCENT" && discountValue > 100) return t("err.percentMax");
    if (discountOverLimit(subtotal, discountPaise, maxDiscountPct)) return t("err.discountMax", { p: maxDiscountPct });
    if (!edit && status === "PARTIAL") {
      if (!partialPaise || partialPaise <= 0) return t("err.enterPaid");
      if (partialPaise > total) return t("bill.paidOverTotal");
    }
    if (edit && total < edit.amountPaid) return t("bill.totalBelowPaid", { paid: formatMoney(edit.amountPaid) });
    return null;
  }

  function save() {
    const problem = validate();
    if (problem) return setError(problem);
    setError(null);
    const customer = { customerName: name.trim() || null, customerPhone: phone.trim() || null, tableNumber: table.trim() || null };

    startTransition(async () => {
      if (edit) {
        const res = await updateOrderAction({
          orderId: edit.orderId,
          ...customer,
          discount,
          lines: lines.map((l) =>
            l.lineId ? { lineId: l.lineId, quantity: l.quantity } : { menuItemId: l.menuItemId!, variantName: l.variantName, quantity: l.quantity },
          ),
        });
        if (!res.ok) return setError(res.error);
        router.push(`/orders/${edit.orderId}`);
        return;
      }
      const payment = { status, method, amount: status === "PARTIAL" ? (partialPaise ?? 0) : undefined };
      const res = dineIn
        ? await settleTableAction({ ...customer, tableNumber: fixedTable, discount, payment })
        : await createOrderAction({
            ...customer,
            discount,
            items: lines.map((l) => ({ menuItemId: l.menuItemId!, variantName: l.variantName, quantity: l.quantity })),
            payment,
          });
      if (!res.ok) return setError(res.error);
      setSaved(res.data);
      window.scrollTo({ top: 0 });
    });
  }

  function sendKot() {
    if (!dineIn || lines.length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await sendKotAction({
        tableNumber: fixedTable,
        items: lines.map((l) => ({ menuItemId: l.menuItemId!, variantName: l.variantName, quantity: l.quantity })),
      });
      if (!res.ok) return setError(res.error);
      setSent(res.data.sent);
      setLines([]);
      setKot(res.data.ticket);
      window.scrollTo({ top: 0 });
    });
  }

  // Saved order: print the bill or the takeaway KOT once the chosen one is rendered for print.
  useEffect(() => {
    if (!printing) return;
    const id = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(id);
  }, [printing]);

  useEffect(() => {
    if (!draftKot) return;
    const id = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(id);
  }, [draftKot]);

  // Takeaway: the bill can be saved only after a KOT is printed for exactly these items.
  const linesSig = lines.map((l) => `${l.key}:${l.quantity}`).join(",");
  const kotPending = !edit && !dineIn && lines.length > 0 && draftKot?.sig !== linesSig;

  function printDraftKot() {
    setDraftKot({
      sig: linesSig,
      kotNumber: 0,
      printedAt: new Date(),
      tableNumber: table.trim(),
      staffName: "",
      items: lines.map((l) => ({ name: l.name, nameHi: l.nameHi, variantName: l.variantName, quantity: l.quantity })),
    });
  }

  // Mobile: a floating bill summary that scrolls down to the bill.
  const billRef = useRef<HTMLDivElement>(null);
  const [billVisible, setBillVisible] = useState(false);
  useEffect(() => {
    const el = billRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setBillVisible(e.isIntersecting), { rootMargin: "0px 0px -30% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [saved, kot]);

  if (saved) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="no-print rounded-2xl bg-ok-soft px-4 py-3 text-center font-semibold text-ok">{t("bill.saved")}</div>
        <div className={printing?.what === "kot" ? "print:hidden" : ""}>
          <Receipt order={saved} />
        </div>
        {!dineIn && (
          <div className={printing?.what === "kot" ? "hidden print:block" : "hidden"}>
            <KotTicket
              kot={{
                kotNumber: saved.orderNumber,
                printedAt: new Date(),
                tableNumber: saved.tableNumber ?? "",
                staffName: "",
                items: saved.items.map((it) => ({ name: it.itemName, nameHi: it.itemNameHi ?? null, variantName: it.variantName, quantity: it.quantity })),
              }}
            />
          </div>
        )}
        <div className="no-print grid grid-cols-2 gap-2.5">
          {!dineIn && (
            <button type="button" className="btn-ghost col-span-2" onClick={() => setPrinting({ what: "kot" })}>
              <ChefHat size={18} /> {t("kot.print")}
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={() => setPrinting({ what: "bill" })}>
            <Printer size={18} /> {t("common.printBill")}
          </button>
          <Link href={`/orders/${saved.id}`} className="btn-ghost">
            <ReceiptText size={18} /> {t("bill.openBill")}
          </Link>
          <button type="button" className="btn-accent col-span-2 h-14 text-base" onClick={reset} autoFocus>
            <Plus size={20} /> {t("bill.next")}
          </button>
        </div>
      </div>
    );
  }

  if (kot) {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <div className="no-print flex items-center justify-center gap-2 rounded-2xl bg-ok-soft px-4 py-3 text-center font-semibold text-ok">
          <ChefHat size={20} /> {t("kot.sent", { no: String(kot.kotNumber).padStart(4, "0") })}
        </div>
        <div className="print:hidden">
          <KotTicket kot={kot} />
        </div>
        <div className="no-print grid grid-cols-2 gap-2.5">
          <button type="button" className="btn-ghost col-span-2" onClick={() => setKot(null)}>
            <Plus size={18} /> {t("kot.addMore")}
          </button>
          <button type="button" className="btn-accent col-span-2 h-14 text-base" onClick={onChangeTable} autoFocus>
            <LayoutGrid size={20} /> {t("kot.backToTables")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    {draftKot && (
      <div className="hidden print:block">
        <KotTicket kot={draftKot} />
      </div>
    )}
    {fixedTable !== undefined && (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-card border border-gold/40 bg-gold-soft px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-gold font-display text-lg font-semibold text-white">
            {fixedTable ?? <ShoppingBag size={20} />}
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("tables.orderFor")}</p>
            <p className="font-display text-lg font-semibold leading-tight">
              {fixedTable ? t("common.table", { n: fixedTable }) : t("tables.takeaway")}
            </p>
          </div>
        </div>
        <button type="button" onClick={onChangeTable} className="btn-ghost btn-sm">
          {t("tables.change")}
        </button>
      </div>
    )}
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <MenuPicker menu={menu} counts={counts} onAdd={add} />

      <div ref={billRef} id="bill-panel" className="card scroll-mt-20 p-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{edit ? t("bill.editTitle") : t("bill.title")}</h2>
          {lines.length > 0 && !edit && (
            <button type="button" onClick={() => setLines([])} className="flex items-center gap-1 text-sm font-medium text-muted hover:text-danger">
              <Trash2 size={15} /> {t("common.clear")}
            </button>
          )}
        </div>

        {sent.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <ChefHat size={14} /> {t("kot.inKitchen")}
            </p>
            <ul className="divide-y divide-line rounded-xl bg-cream px-3">
              {sent.map((l) => (
                <li key={l.key} className="flex items-center gap-2 py-2 text-sm">
                  <Lock size={13} className="shrink-0 text-muted" />
                  <div className="min-w-0 flex-1 truncate">
                    {itemNames({ name: l.name, nameHi: l.nameHi }, locale).primary}
                    {l.variantName && <span className="text-muted"> · {sizeName(l.variantName, locale)}</span>}
                  </div>
                  <span className="w-8 text-center font-semibold tabular-nums">×{l.quantity}</span>
                  <span className="w-16 text-right tabular-nums">{formatMoney(l.unitPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>
            {lines.length > 0 && <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-rani">{t("kot.new")}</p>}
          </div>
        )}

        {lines.length === 0 ? (
          sent.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-line py-8 text-center text-sm text-muted">
              <ShoppingBag size={28} className="mb-2 text-leaf/60" />
              {t("bill.empty")}
            </div>
          )
        ) : (
          <ul className="divide-y divide-line">
            {lines.map((l) => {
              const display = itemNames({ name: l.name, nameHi: l.nameHi }, locale).primary;
              return (
              <li key={l.key} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold leading-tight">{display}</div>
                  <div className="text-xs text-muted">
                    {l.variantName && <>{sizeName(l.variantName, locale)} · </>}
                    {formatMoney(l.unitPrice)}
                    {l.lineId && edit && <span className="ml-1 rounded bg-cream-deep px-1">{t("bill.savedPrice")}</span>}
                  </div>
                </div>
                <div className="flex items-center rounded-xl border border-line bg-white">
                  <button type="button" onClick={() => setQty(l.key, l.quantity - 1)} className="grid size-10 place-items-center text-muted hover:text-ink" aria-label={t("bill.oneLess", { name: display })}>
                    <Minus size={16} />
                  </button>
                  <span className="w-7 text-center font-semibold tabular-nums">{l.quantity}</span>
                  <button type="button" onClick={() => setQty(l.key, l.quantity + 1)} className="grid size-10 place-items-center text-muted hover:text-ink" aria-label={t("bill.oneMore", { name: display })}>
                    <Plus size={16} />
                  </button>
                </div>
                <div className="w-16 text-right font-semibold tabular-nums">{formatMoney(l.unitPrice * l.quantity)}</div>
              </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <CustomerFields phone={phone} name={name} table={table} onPhone={setPhone} onName={setName} onTable={setTable} showTable={fixedTable === undefined} />

          <div>
            <span className="label">
              {t("bill.discount")}
              {maxDiscountPct < 100 && <span className="font-normal text-muted"> · max {maxDiscountPct}%</span>}
            </span>
            <div className="flex gap-2">
              <div className="flex rounded-xl border border-line bg-white p-1">
                {(["FLAT", "PERCENT"] as const).map((dt) => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => setDiscountType(dt)}
                    className={`h-10 w-11 rounded-lg text-sm font-bold ${discountType === dt ? "bg-leaf text-white" : "text-muted"}`}
                    aria-pressed={discountType === dt}
                  >
                    {dt === "FLAT" ? "₹" : "%"}
                  </button>
                ))}
              </div>
              <input
                className="input"
                inputMode="decimal"
                placeholder="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value.replace(/[^\d.]/g, ""))}
                aria-label={t("bill.discount")}
              />
            </div>
          </div>

          <dl className="space-y-1 rounded-xl bg-cream px-3.5 py-3 text-sm tabular-nums">
            <div className="flex justify-between">
              <dt className="text-muted">{t("bill.subtotalItems", { n: itemCount })}</dt>
              <dd>{formatMoney(subtotal)}</dd>
            </div>
            {discountPaise > 0 && (
              <div className="flex justify-between text-rani">
                <dt>{t("bill.discount")}</dt>
                <dd>− {formatMoney(discountPaise)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between pt-1 text-base font-bold">
              <dt>{t("bill.total")}</dt>
              <dd className="font-display text-2xl text-leaf-dark">{formatMoney(total)}</dd>
            </div>
            {edit && edit.amountPaid > 0 && (
              <div className="flex justify-between text-muted">
                <dt>{t("bill.alreadyPaid")}</dt>
                <dd>{formatMoney(edit.amountPaid)}</dd>
              </div>
            )}
          </dl>

          {!edit && !(dineIn && lines.length > 0) && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-white p-1" role="radiogroup" aria-label={t("bill.paymentStatus")}>
                {(
                  [
                    ["PAID", t("bill.pay.PAID"), "bg-ok"],
                    ["PARTIAL", t("bill.pay.PARTIAL"), "bg-warn"],
                    ["UNPAID", t("bill.pay.UNPAID"), "bg-danger"],
                  ] as const
                ).map(([value, label, bg]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={status === value}
                    onClick={() => setStatus(value)}
                    className={`h-11 rounded-lg text-sm font-bold transition ${status === value ? `${bg} text-white` : "text-muted"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {status !== "UNPAID" && <MethodPicker value={method} onChange={setMethod} showLabel={false} />}

              {status === "PARTIAL" && (
                <div>
                  <label htmlFor="partial" className="label">{t("bill.partialAmount")}</label>
                  <input id="partial" className="input" inputMode="decimal" placeholder="0" value={partial} onChange={(e) => setPartial(e.target.value.replace(/[^\d.]/g, ""))} />
                  {partialPaise !== null && partialPaise > 0 && partialPaise < total && (
                    <p className="mt-1 text-sm text-danger">{t("bill.dueAfter", { amount: formatMoney(total - partialPaise) })}</p>
                  )}
                </div>
              )}

              {status === "PAID" && method === "CASH" && total > 0 && (
                <div>
                  <label htmlFor="cash" className="label">{t("bill.cashReceived")}</label>
                  <input id="cash" className="input" inputMode="decimal" placeholder={String(total / 100)} value={cashGiven} onChange={(e) => setCashGiven(e.target.value.replace(/[^\d.]/g, ""))} />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[50, 100, 200, 500, 2000]
                      .filter((n) => n * 100 >= total)
                      .slice(0, 3)
                      .map((n) => (
                        <button key={n} type="button" className="chip h-9 border-line bg-white" onClick={() => setCashGiven(String(n))}>
                          ₹{n}
                        </button>
                      ))}
                  </div>
                  {change !== null && (
                    <p className="mt-2 rounded-xl bg-gold-soft px-3.5 py-2 font-semibold text-[#7a5510]">
                      {t("bill.giveBack", { amount: formatMoney(change) })}
                    </p>
                  )}
                  {cashPaise !== null && cashPaise < total && <p className="mt-1 text-sm text-danger">{t("bill.lessThanTotal")}</p>}
                </div>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {edit && (
              <Link href={`/orders/${edit.orderId}`} className="btn-ghost flex-1">
                {t("common.cancel")}
              </Link>
            )}
            {dineIn && lines.length > 0 ? (
              <button type="button" onClick={sendKot} disabled={pending} className="btn-accent h-14 flex-[2] text-base">
                {pending ? <LoaderCircle size={18} className="animate-spin" /> : <ChefHat size={20} />}
                {t("kot.send", { n: newCount })}
              </button>
            ) : (
              <>
              {!edit && !dineIn && lines.length > 0 && (
                <button type="button" onClick={printDraftKot} className={`${kotPending ? "btn-accent" : "btn-ghost"} h-14 flex-1 text-base`}>
                  <ChefHat size={20} /> {t("kot.print")}
                </button>
              )}
              <button type="button" onClick={save} disabled={pending || kotPending || (lines.length === 0 && sent.length === 0)} className="btn-primary h-14 flex-[2] text-base">
                {pending && <LoaderCircle size={18} className="animate-spin" />}
                {edit ? t("bill.saveChanges") : t("bill.save", { amount: formatMoney(total) })}
              </button>
              </>
            )}
          </div>
        </div>
      </div>

      {itemCount > 0 && !billVisible && (
        <button
          type="button"
          onClick={() => billRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="no-print fixed inset-x-6 bottom-28 z-30 flex h-12 items-center justify-between rounded-full bg-leaf px-5 font-semibold text-white shadow-float lg:hidden"
        >
          <span>{t("bill.itemsTotal", { n: itemCount, amount: formatMoney(total) })}</span>
          <span className="flex items-center gap-1 text-sm">
            {t("bill.view")} <ChevronDown size={16} />
          </span>
        </button>
      )}
    </div>
    </>
  );
}
