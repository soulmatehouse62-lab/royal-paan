import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import { networkInterfaces } from "node:os";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth/session";
import { BrandMark } from "@/components/brand-mark";
import { PrintButton } from "./print-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("qr.title") };
}

function lanIp(): string | null {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return null;
}

/** PUBLIC_BASE_URL, else the current host with localhost swapped for this machine's LAN IP. */
async function menuUrl(): Promise<string> {
  const base = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (base) return `${base}/m`;
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  let host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const [hostname, port] = host.split(":");
  if (["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname)) {
    const ip = lanIp();
    if (ip) host = port ? `${ip}:${port}` : ip;
  }
  return `${proto}://${host}/m`;
}

export default async function QrPage() {
  const [, t, url] = await Promise.all([requireUser(), getT(), menuUrl()]);
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1a1510", light: "#ffffff" } });

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div id="bill" className="card flex flex-col items-center px-6 py-8 text-center">
        <BrandMark size={52} />
        <h1 className="mt-3 text-2xl font-semibold text-leaf-dark">{t("brand.short")}</h1>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rani">{t("brand.tagline")}</p>
        <div className="mt-5 w-full max-w-64 rounded-2xl border border-line bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-4 font-display text-xl font-semibold">{t("qr.scan")}</p>
        <p className="text-sm text-muted">{/* Printed cards are read by every guest, so show the other language too. */}
          {makeT(t.locale === "hi" ? "en" : "hi")("qr.scan")}</p>
        <p className="mt-1 break-all text-xs text-muted">{url}</p>
      </div>
      <PrintButton label={t("qr.print")} />
      <p className="no-print text-center text-xs text-muted">
        {t("qr.hint")}
      </p>
    </div>
  );
}
