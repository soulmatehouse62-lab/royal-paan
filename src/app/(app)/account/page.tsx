import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { PageTitle } from "@/components/ui";
import { LangChooser } from "@/components/lang-toggle";
import { ChangePasswordForm, SessionButtons } from "./account-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("acc.title") };
}

export default async function AccountPage() {
  const [user, t] = await Promise.all([requireUser(), getT()]);
  return (
    <div className="mx-auto max-w-lg">
      <PageTitle title={t("acc.title")} subtitle={`${user.name} · @${user.username} · ${t(`role.${user.role}` as const)}`} />

      <section className="card mb-4 p-5">
        <h2 className="mb-3 text-lg font-semibold">भाषा / Language</h2>
        <LangChooser />
      </section>

      {user.role === "ADMIN" && (
        <Link href="/users" className="card mb-4 flex items-center gap-3 p-4 transition hover:border-leaf/40">
          <span className="grid size-10 place-items-center rounded-xl bg-leaf-soft text-leaf">
            <Users size={20} />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">{t("acc.team")}</span>
            <span className="block text-sm text-muted">{t("acc.teamHint")}</span>
          </span>
          <ChevronRight className="text-muted" />
        </Link>
      )}

      <section className="card mb-4 p-5">
        <h2 className="mb-4 text-lg font-semibold">{t("acc.changePw")}</h2>
        <ChangePasswordForm />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">{t("acc.devices")}</h2>
        <SessionButtons />
      </section>
    </div>
  );
}
