import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale } from "./index";

/** The viewer's language, from the "lang" cookie. Cached per request. */
export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
});

export async function getT() {
  const locale = await getLocale();
  return Object.assign(makeT(locale), { locale });
}
