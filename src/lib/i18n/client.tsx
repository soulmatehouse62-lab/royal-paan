"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, makeT, type Locale, type T } from "./index";

// Only the locale crosses from server to client; the dictionaries ship in the
// (cached) JS bundle, so they aren't resent with every page.
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

export function useT(): T {
  const locale = useLocale();
  return useMemo(() => makeT(locale), [locale]);
}
