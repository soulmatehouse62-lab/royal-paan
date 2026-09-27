// Shared by server and client. No framework imports here.
import { en, hi, type MessageKey, type Messages } from "./messages";

export type { MessageKey };
export type Locale = "hi" | "en";
export const LOCALES: Locale[] = ["hi", "en"];
/** Staff are local, so Hindi is the default until someone switches. */
export const DEFAULT_LOCALE: Locale = "hi";
export const LOCALE_COOKIE = "lang";

export const isLocale = (v: unknown): v is Locale => v === "hi" || v === "en";

export type Params = Record<string, string | number>;
export type T = (key: MessageKey, params?: Params) => string;

const DICTS: Record<Locale, Messages> = { en, hi };

export function isMessageKey(k: string): k is MessageKey {
  return k in en;
}

export function makeT(locale: Locale): T {
  const dict = DICTS[locale];
  return (key, params) => {
    let s: string = dict[key] ?? en[key] ?? key;
    if (s.includes("|")) {
      const [one, other] = s.split("|");
      s = params?.n === 1 ? one : other;
    }
    return params ? s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m)) : s;
  };
}

/** Intl locale for dates: Hindi month names, Latin digits. */
export const intlLocale = (locale: Locale) => (locale === "hi" ? "hi-IN" : "en-IN");

/** The item's name in the chosen language, plus the other one as a hint. */
export function itemNames(item: { name: string; nameHi?: string | null }, locale: Locale) {
  if (locale === "hi" && item.nameHi) return { primary: item.nameHi, secondary: item.name };
  return { primary: item.name, secondary: null as string | null };
}
