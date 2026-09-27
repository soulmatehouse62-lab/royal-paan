import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { requireAdminPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { UsersManager } from "./users-manager";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("team.title") };
}

export default async function UsersPage() {
  const [me, t] = await Promise.all([requireAdminPage(), getT()]);
  const now = new Date();
  const [users, sessions] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { username: "asc" }],
      select: { id: true, username: true, name: true, role: true, isActive: true, lastLoginAt: true },
    }),
    prisma.session.groupBy({ by: ["userId"], where: { expiresAt: { gt: now } }, _count: true }),
  ]);
  const counts = new Map(sessions.map((s) => [s.userId, s._count]));

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("team.title")} subtitle={t("team.subtitle")} />
      <UsersManager
        meId={me.id}
        users={users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, sessions: counts.get(u.id) ?? 0 }))}
      />
    </div>
  );
}
