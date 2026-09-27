// Timestamps are stored in UTC; everything shown or reported uses TIME_ZONE.
// The week starts on Monday.

export const TIME_ZONE = "Asia/Kolkata";

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zonedParts(date: Date) {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFmt.formatToParts(date)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset of TIME_ZONE from UTC at `date`, in ms. */
function offsetMs(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date "YYYY-MM-DD" of `date` in TIME_ZONE. */
export function toYmd(date: Date = new Date()): string {
  const p = zonedParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function isYmd(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** UTC instant of local midnight at the start of `ymd`. */
export function startOfDay(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMs(new Date(guess));
  // Re-check at the real instant in case the zone has DST.
  return new Date(guess - offsetMs(new Date(first)));
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function daysBetween(fromYmd: string, toYmdStr: string): number {
  const [a, b] = [fromYmd, toYmdStr].map((s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}

/** Monday of the week containing `ymd`. */
export function startOfWeek(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(ymd, -((dow + 6) % 7));
}

export function startOfMonth(ymd: string): string {
  return ymd.slice(0, 8) + "01";
}

/** Half-open UTC range [start, end) covering local days fromYmd..toYmd inclusive. */
export function dayRange(fromYmd: string, toYmdStr: string) {
  return { start: startOfDay(fromYmd), end: startOfDay(addDays(toYmdStr, 1)) };
}

export function eachDay(fromYmd: string, toYmdStr: string): string[] {
  const out: string[] = [];
  for (let d = fromYmd; d <= toYmdStr; d = addDays(d, 1)) out.push(d);
  return out;
}

type Loc = "hi" | "en";
const ymdOpts: Intl.DateTimeFormatOptions = { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric" };
const fmts = {
  dateTime: {
    en: new Intl.DateTimeFormat("en-IN", { ...ymdOpts, hour: "numeric", minute: "2-digit", hour12: true }),
    hi: new Intl.DateTimeFormat("hi-IN", { ...ymdOpts, hour: "numeric", minute: "2-digit", hour12: true }),
  },
  date: { en: new Intl.DateTimeFormat("en-IN", ymdOpts), hi: new Intl.DateTimeFormat("hi-IN", ymdOpts) },
  short: {
    en: new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short" }),
    hi: new Intl.DateTimeFormat("hi-IN", { timeZone: "UTC", day: "numeric", month: "short" }),
  },
};

export const formatDateTime = (d: Date | string, locale: Loc = "en") => fmts.dateTime[locale].format(new Date(d));
export const formatDate = (d: Date | string, locale: Loc = "en") => fmts.date[locale].format(new Date(d));
/** "2026-09-26" → "26 Sept" / "26 सित॰" */
export const formatYmdShort = (ymd: string, locale: Loc = "en") => fmts.short[locale].format(new Date(ymd + "T00:00:00Z"));

type AgeT = (key: "age.now" | "age.min" | "age.hour" | "age.day", p?: { n: number }) => string;
/** "just now", "35 min ago", "5 h ago", "3 d ago" – in the viewer's language. */
export function formatAge(from: Date | string, t: AgeT, now: Date = new Date()): string {
  const mins = Math.max(0, Math.floor((now.getTime() - new Date(from).getTime()) / 60_000));
  if (mins < 1) return t("age.now");
  if (mins < 60) return t("age.min", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("age.hour", { n: hours });
  return t("age.day", { n: Math.floor(hours / 24) });
}

export function greetingKey(now: Date = new Date()): "greet.morning" | "greet.afternoon" | "greet.evening" {
  const h = zonedParts(now).hour;
  if (h < 12) return "greet.morning";
  if (h < 17) return "greet.afternoon";
  return "greet.evening";
}
