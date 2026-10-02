import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensurePrintJobIndexes, isLoggedInUser, json, JOB_TTL_MS, PRINT_TYPES, type PrintType } from "@/lib/printAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Queue a ticket for the shop printer. Body: { type, data }. */
export async function POST(request: Request) {
  if (!(await isLoggedInUser(request))) return json({ error: "Not signed in" }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const { type, data } = (body ?? {}) as { type?: unknown; data?: unknown };
  if (typeof type !== "string" || !PRINT_TYPES.includes(type as PrintType)) {
    return json({ error: "type must be kot, bill or test" }, 400);
  }
  if (data !== undefined && (data === null || typeof data !== "object" || Array.isArray(data))) {
    return json({ error: "data must be an object" }, 400);
  }

  await ensurePrintJobIndexes();
  const job = await prisma.printJob.create({
    data: {
      type,
      data: (data ?? {}) as Prisma.InputJsonObject,
      status: "pending",
      attempts: 0,
      error: null,
      leaseUntil: null,
      expiresAt: new Date(Date.now() + JOB_TTL_MS),
    },
    select: { id: true, status: true },
  });
  return json({ id: job.id, status: job.status }, 201);
}
