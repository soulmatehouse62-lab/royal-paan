import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/** How long the agent owns a claimed job before it is handed out again. */
export const LEASE_MS = 60_000;
export const MAX_ATTEMPTS = 5;
export const JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PRINT_TYPES = ["kot", "bill", "test"] as const;
export type PrintType = (typeof PRINT_TYPES)[number];

/** The shop laptop's print agent, identified by the x-agent-key header. */
export function isAgent(request: Request): boolean {
  const expected = process.env.PRINT_AGENT_KEY;
  const given = request.headers.get("x-agent-key");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Same check the other API routes use: a valid session cookie. */
export async function isLoggedInUser(_request: Request): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

let indexesReady: Promise<void> | null = null;

/**
 * Prisma cannot declare TTL indexes, so create them once per server process.
 * createIndexes is a no-op when an identical index already exists.
 */
export function ensurePrintJobIndexes(): Promise<void> {
  // One command per index: if `prisma db push` already made one under another
  // name, that command fails without stopping the other.
  const create = (index: Record<string, unknown>) =>
    prisma.$runCommandRaw({ createIndexes: "printjobs", indexes: [index] as never }).then(
      () => true,
      (e) => {
        console.error(`printjobs index ${index.name} not created:`, e instanceof Error ? e.message : e);
        return false;
      },
    );
  indexesReady ??= Promise.all([
    create({ key: { status: 1, createdAt: 1 }, name: "printjobs_status_createdAt_idx" }),
    create({ key: { expiresAt: 1 }, name: "printjobs_expiresAt_ttl", expireAfterSeconds: 0 }),
  ]).then(([, ttl]) => {
    if (!ttl) indexesReady = null; // try again on the next request
  });
  return indexesReady;
}
