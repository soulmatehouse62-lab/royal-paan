import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth/session";
import { getWaitingKots } from "@/lib/table-orders";
import { PageTitle } from "@/components/ui";
import { KotQueue } from "./kot-queue";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("kotq.title") };
}

export default async function KotsPage() {
  const [, t] = await Promise.all([requireUser(), getT()]);
  const waiting = await getWaitingKots();

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("kotq.title")} subtitle={t("kotq.hint")} />
      <KotQueue waiting={waiting} />
    </div>
  );
}
