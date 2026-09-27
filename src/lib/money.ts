// All amounts are integers in paise (1 ₹ = 100 paise).

const whole = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const fractional = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 12350 → "₹123.50", 12000 → "₹120" */
export function formatMoney(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = abs / 100;
  return `${sign}₹${abs % 100 === 0 ? whole.format(rupees) : fractional.format(rupees)}`;
}

/** Plain number for inputs and CSV: 12350 → "123.50", 12000 → "120" */
export function paiseToInput(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/** "123.5" → 12350. Returns null for anything that isn't a valid amount. */
export function parseRupees(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim().replace(/,/g, "").replace(/^₹/, "");
  if (!/^\d{1,7}(\.\d{0,2})?$/.test(s)) return null;
  const [r, p = ""] = s.split(".");
  return Number(r) * 100 + Number((p + "00").slice(0, 2));
}
