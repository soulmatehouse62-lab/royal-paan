import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getMenu } from "@/lib/menu-data";
import { PageTitle } from "@/components/ui";
import { MenuManager } from "./menu-manager";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("menu.title") };
}

export default async function MenuPage() {
  const [user, t, menu] = await Promise.all([requireUser(), getT(), getMenu()]);
  const available = menu.filter((m) => m.isAvailable).length;

  return (
    <>
      <PageTitle
        title={t("menu.title")}
        subtitle={t("menu.subtitle", { n: menu.length, a: available })}
        action={
          <Link href="/menu/qr" className="btn-ghost btn-sm">
            <QrCode size={16} /> {t("menu.qr")}
          </Link>
        }
      />
      <MenuManager menu={menu} isAdmin={user.role === "ADMIN"} />
    </>
  );
}
