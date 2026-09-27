"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, LoaderCircle, LogOut, Plus, ShieldCheck, UserRound } from "lucide-react";
import type { Role } from "@prisma/client";
import { createUserAction, resetPasswordAction, setActiveAction, setRoleAction, signOutUserAction } from "@/app/actions/users";
import { formatAge } from "@/lib/time";
import { useT } from "@/lib/i18n/client";
import { Sheet } from "@/components/sheet";

type U = { id: string; username: string; name: string; role: Role; isActive: boolean; lastLoginAt: string | null; sessions: number };
type Shown = { username: string; password: string };

export function UsersManager({ users, meId }: { users: U[]; meId: string }) {
  const router = useRouter();
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [shown, setShown] = useState<Shown | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function act(id: string, fn: () => Promise<{ ok: true; data: unknown } | { ok: false; error: string }>, onData?: (d: unknown) => void) {
    setBusy(id);
    setError(null);
    start(async () => {
      const res = await fn();
      setBusy(null);
      if (!res.ok) return setError(res.error);
      onData?.(res.data);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className="btn-accent mb-4 w-full sm:w-auto" onClick={() => setAdding(true)}>
        <Plus size={18} /> {t("team.add")}
      </button>
      {error && <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}

      <ul className="space-y-3">
        {users.map((u) => {
          const me = u.id === meId;
          return (
            <li key={u.id} className={`card p-4 ${u.isActive ? "" : "opacity-70"}`}>
              <div className="flex items-start gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${u.role === "ADMIN" ? "bg-rani-soft text-rani" : "bg-leaf-soft text-leaf"}`}>
                  {u.role === "ADMIN" ? <ShieldCheck size={20} /> : <UserRound size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {u.name} {me && <span className="text-xs font-medium text-muted">{t("team.you")}</span>}
                  </div>
                  <div className="text-sm text-muted">
                    @{u.username} · {t(`role.${u.role}` as const)}
                    {!u.isActive && <span className="font-semibold text-danger"> · {t("team.disabled")}</span>}
                  </div>
                  <div className="text-xs text-muted">
                    {u.lastLoginAt ? t("team.lastSignIn", { age: formatAge(u.lastLoginAt, t) }) : t("team.never")} · {t("team.sessions", { n: u.sessions })}
                  </div>
                </div>
                {busy === u.id && <LoaderCircle size={18} className="animate-spin text-muted" />}
              </div>

              {!me && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <select
                    className="input h-10 w-auto rounded-lg py-0 text-sm"
                    value={u.role}
                    aria-label={t("team.roleFor", { u: u.username })}
                    onChange={(e) => act(u.id, () => setRoleAction(u.id, e.target.value))}
                  >
                    <option value="STAFF">{t("role.STAFF")}</option>
                    <option value="ADMIN">{t("role.ADMIN")}</option>
                  </select>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => act(u.id, () => setActiveAction(u.id, !u.isActive))}>
                    {u.isActive ? t("team.disable") : t("team.enable")}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      if (confirm(t("team.resetQ", { u: u.username }))) {
                        act(u.id, () => resetPasswordAction(u.id), (d) => setShown(d as Shown));
                      }
                    }}
                  >
                    <KeyRound size={15} /> {t("team.reset")}
                  </button>
                  {u.sessions > 0 && (
                    <button type="button" className="btn-ghost btn-sm" onClick={() => act(u.id, () => signOutUserAction(u.id))}>
                      <LogOut size={15} /> {t("team.signOut")}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {adding && <AddUserSheet onClose={() => setAdding(false)} onCreated={(s) => { setAdding(false); setShown(s); router.refresh(); }} />}

      <Sheet open={!!shown} onClose={() => setShown(null)} title={t("team.newPw")}>
        {shown && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {t("team.giveThis", { u: shown.username })}
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-3">
              <code className="flex-1 break-all font-mono text-lg font-semibold">{shown.password}</code>
              <button type="button" className="btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(shown.password)}>
                <Copy size={15} /> {t("team.copy")}
              </button>
            </div>
            <button type="button" className="btn-primary w-full" onClick={() => setShown(null)}>{t("team.done")}</button>
          </div>
        )}
      </Sheet>
    </>
  );
}

function AddUserSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Shown) => void }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    start(async () => {
      const res = await createUserAction({
        username: String(f.get("username") ?? ""),
        name: String(f.get("name") ?? ""),
        role: String(f.get("role") ?? "STAFF"),
        password: String(f.get("password") ?? ""),
      });
      if (!res.ok) return setError(res.error);
      onCreated(res.data);
    });
  }

  return (
    <Sheet open onClose={onClose} title={t("team.add")}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="u-name" className="label">{t("team.fullName")}</label>
          <input id="u-name" name="name" className="input" required maxLength={60} autoFocus />
        </div>
        <div>
          <label htmlFor="u-username" className="label">{t("team.username")}</label>
          <input id="u-username" name="username" className="input" required autoCapitalize="none" spellCheck={false} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,31}" placeholder={t("team.usernamePh")} />
        </div>
        <div>
          <label htmlFor="u-role" className="label">{t("team.role")}</label>
          <select id="u-role" name="role" className="input" defaultValue="STAFF">
            <option value="STAFF">{t("team.roleStaff")}</option>
            <option value="ADMIN">{t("team.roleAdmin")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="u-password" className="label">{t("team.pwOptional")}</label>
          <input id="u-password" name="password" type="text" className="input" autoComplete="off" />
        </div>
        {error && <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending && <LoaderCircle size={18} className="animate-spin" />} {t("team.create")}
        </button>
      </form>
    </Sheet>
  );
}
