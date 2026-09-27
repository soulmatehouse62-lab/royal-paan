"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { run } from "@/lib/action";
import {
  clearSessionCookie,
  createSession,
  endSessionsForUser,
  getCurrentUser,
  requireUser,
  safeNextPath,
} from "@/lib/auth/session";
import { MIN_PASSWORD_LENGTH, burnVerifyTime, hashPassword, normalizeUsername, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { getT } from "@/lib/i18n/server";
import type { MessageKey, Params } from "@/lib/i18n";
import { clearFailures, lockedMinutes, recordFailure } from "@/lib/auth/throttle";
import { ActionError } from "@/lib/db";

export type FormState = { error?: string; ok?: string; username?: string } | null;

async function msg(key: MessageKey, params?: Params) {
  return (await getT())(key, params);
}

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const username = normalizeUsername(String(form.get("username") ?? "")).slice(0, 64);
  const password = String(form.get("password") ?? "").slice(0, 200);
  if (!username || !password) return { error: await msg("err.enterCreds"), username };

  const locked = await lockedMinutes(username);
  if (locked > 0) {
    return { error: await msg("err.locked", { n: locked }), username };
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, passwordHash: true, isActive: true },
  });

  let valid = false;
  if (user) {
    valid = await verifyPassword(password, user.passwordHash);
  } else {
    await burnVerifyTime(password); // same timing as a real check
  }

  if (!user || !valid || !user.isActive) {
    await recordFailure(username);
    return { error: await msg("err.wrongLogin"), username };
  }

  await clearFailures(username);
  await Promise.all([
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } }),
    createSession(user.id),
  ]);
  redirect(safeNextPath(form.get("next")));
}

export async function signOutAction() {
  const user = await getCurrentUser();
  if (user) await prisma.session.deleteMany({ where: { id: user.sessionId } });
  await clearSessionCookie();
  redirect("/login");
}

export async function signOutOthersAction(): Promise<FormState> {
  const res = await run(async () => {
    const user = await requireUser();
    await endSessionsForUser(user.id, user.sessionId);
    return null;
  });
  return res.ok ? { ok: await msg("ok.signedOutOthers") } : { error: res.error };
}

const changeSchema = z.object({
  current: z.string().min(1, "err.enterCurrent").max(200),
  next: z.string().max(200),
  confirm: z.string().max(200),
});

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const res = await run(async () => {
    const me = await requireUser();
    const v = changeSchema.parse(Object.fromEntries(form));
    if (v.next !== v.confirm) throw new ActionError("err.pwMismatch");
    const problem = passwordProblem(v.next, me.username);
    if (problem) throw new ActionError(problem, { n: MIN_PASSWORD_LENGTH });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true } });
    if (!(await verifyPassword(v.current, user.passwordHash))) throw new ActionError("err.pwCurrentWrong");

    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash: await hashPassword(v.next), passwordChangedAt: new Date() },
    });
    // End every session (including this one), then sign this device back in.
    await endSessionsForUser(me.id);
    await createSession(me.id);
    return null;
  });
  return res.ok ? { ok: await msg("ok.pwChanged") } : { error: res.error };
}
