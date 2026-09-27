import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma, ActionError } from "@/lib/db";
import { SECURE_COOKIE, SESSION_COOKIE } from "./cookie";

const IDLE_MS = 12 * 60 * 60 * 1000; // 12 hours without activity
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days at most
const TOUCH_EVERY_MS = 5 * 60 * 1000; // write lastSeenAt at most every 5 minutes

export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
  sessionId: string;
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url"); // 256 bits
  const now = new Date();
  const expiresAt = new Date(now.getTime() + MAX_AGE_MS);
  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 300) || null;
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, createdAt: now, lastSeenAt: now, expiresAt, userAgent },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE_COOKIE,
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/", secure: SECURE_COOKIE });
}

/** The signed-in user, or null. Cached for the duration of one request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      lastSeenAt: true,
      user: { select: { id: true, username: true, name: true, role: true, isActive: true, passwordChangedAt: true } },
    },
  });
  if (!session) return null;

  const now = Date.now();
  const expired =
    session.expiresAt.getTime() <= now ||
    session.lastSeenAt.getTime() + IDLE_MS <= now ||
    !session.user.isActive ||
    session.createdAt < session.user.passwordChangedAt;
  if (expired) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  if (now - session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    // Fire and forget: don't make the page wait for this write.
    prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } }).catch(() => {});
  }

  const { user } = session;
  return { id: user.id, username: user.username, name: user.name, role: user.role, sessionId: session.id };
});

/** Every page, server action and API route calls this itself. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const path = (await headers()).get("x-pathname");
    redirect(path && path !== "/" ? `/login?next=${encodeURIComponent(path)}` : "/login");
  }
  return user;
}

/** For admin-only pages: staff are sent back to the home screen. */
export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** For admin-only server actions. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ActionError("err.adminOnly");
  return user;
}

export async function endSessionsForUser(userId: string, exceptSessionId?: string) {
  await prisma.session.deleteMany({
    where: exceptSessionId ? { userId, id: { not: exceptSessionId } } : { userId },
  });
}

/** Only allow same-site paths after sign-in, e.g. "/dues?phone=98". */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  try {
    const url = new URL(next, "http://local.invalid");
    if (url.origin !== "http://local.invalid" || url.pathname.startsWith("/login")) return "/";
    return url.pathname + url.search;
  } catch {
    return "/";
  }
}
