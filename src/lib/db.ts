import { Prisma, PrismaClient } from "@prisma/client";
import type { MessageKey, Params } from "@/lib/i18n";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Tx = Prisma.TransactionClient;

/**
 * A business-rule failure the user should see. It carries a message key and
 * params; run() translates it into the viewer's language.
 */
export class ActionError extends Error {
  constructor(
    public readonly key: MessageKey,
    public readonly params?: Params,
  ) {
    super(key);
    this.name = "ActionError";
  }
}

function isRetryable(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2034" || e.code === "P2002")) {
    // P2034 = write conflict. P2002 only happens inside our transactions when two
    // of them race to create the order counter for the very first time.
    return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  return /WriteConflict|write conflict|TransientTransactionError/i.test(msg);
}

/**
 * Run `fn` in a MongoDB transaction, retrying on write conflicts. Callers
 * write to the order document first so concurrent changes to the same order
 * conflict straight away instead of computing on stale data.
 */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>, attempts = 6): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { maxWait: 5_000, timeout: 15_000 });
    } catch (e) {
      if (e instanceof ActionError || attempt >= attempts || !isRetryable(e)) throw e;
      await new Promise((r) => setTimeout(r, 15 * 2 ** attempt + Math.random() * 40));
    }
  }
}

export const isObjectId = (id: unknown): id is string => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);

/** Numbers from aggregateRaw can arrive as EJSON ({ $numberLong: "…" }). */
export function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, string>;
    const raw = o.$numberLong ?? o.$numberInt ?? o.$numberDouble ?? o.$numberDecimal;
    if (raw !== undefined) return Number(raw);
  }
  return Number(v ?? 0) || 0;
}

export function oid(v: unknown): string {
  if (v && typeof v === "object" && "$oid" in (v as object)) return (v as { $oid: string }).$oid;
  return String(v);
}

export function ejsonDate(v: unknown): Date {
  if (v && typeof v === "object" && "$date" in (v as object)) {
    const d = (v as { $date: string | { $numberLong: string } }).$date;
    return new Date(typeof d === "string" ? d : Number(d.$numberLong));
  }
  return new Date(v as string);
}

/** A Date as an EJSON literal for aggregateRaw / findRaw. */
export const dateArg = (d: Date) => ({ $date: d.toISOString() });
