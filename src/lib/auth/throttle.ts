import "server-only";
import { prisma } from "@/lib/db";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const key = (username: string) => `user:${username}`;

/** Minutes left on a lock, or 0 when sign-in is allowed. */
export async function lockedMinutes(username: string): Promise<number> {
  const row = await prisma.loginThrottle.findUnique({ where: { id: key(username) } });
  const until = row?.lockedUntil?.getTime() ?? 0;
  return until > Date.now() ? Math.ceil((until - Date.now()) / 60_000) : 0;
}

/** Record a wrong password. Applies to unknown usernames too, so locks don't reveal anything. */
export async function recordFailure(username: string): Promise<void> {
  const id = key(username);
  const now = new Date();
  const row = await prisma.loginThrottle.findUnique({ where: { id } });

  const windowOpen = row && now.getTime() - row.windowStart.getTime() < WINDOW_MS;
  const failures = (windowOpen ? row.failures : 0) + 1;
  const lock = failures >= MAX_FAILURES;
  const data = {
    failures: lock ? 0 : failures,
    windowStart: windowOpen ? row.windowStart : now,
    lockedUntil: lock ? new Date(now.getTime() + LOCK_MS) : (row?.lockedUntil ?? null),
  };
  await prisma.loginThrottle.upsert({ where: { id }, create: { id, ...data }, update: data });
}

export async function clearFailures(username: string): Promise<void> {
  await prisma.loginThrottle.deleteMany({ where: { id: key(username) } });
}
