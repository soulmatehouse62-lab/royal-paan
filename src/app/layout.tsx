import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, Mukta, Tiro_Devanagari_Hindi } from "next/font/google";
import { getLocale, getT } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
// Devanagari fonts are not preloaded: the browser downloads them only when Hindi
// text is on screen (unicode-range), so English pages don't pay for them.
const mukta = Mukta({ subsets: ["devanagari"], weight: ["400", "500", "600", "700"], variable: "--font-mukta", display: "swap", preload: false });
const tiro = Tiro_Devanagari_Hindi({ subsets: ["devanagari"], weight: "400", variable: "--font-tiro", display: "swap", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t("brand.short"), template: `%s · ${t("brand.short")}` },
    description: t("brand.name"),
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#1e5631",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${fraunces.variable} ${dmSans.variable} ${mukta.variable} ${tiro.variable}`}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
