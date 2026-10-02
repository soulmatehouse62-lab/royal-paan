import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isAgent, json, LEASE_MS, MAX_ATTEMPTS } from "@/lib/printAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Waiting, or claimed by an agent whose lease has run out. */
const available = (now: Date): Prisma.PrintJobWhereInput => ({
  OR: [{ status: "pending" }, { status: "printing", leaseUntil: { lt: now } }],
});

/** The agent takes the oldest waiting job. 204 = nothing to print. */
export async function GET(request: Request) {
  if (!isAgent(request)) return json({ error: "Invalid agent key" }, 401);

  const now = new Date();
  await prisma.printJob.updateMany({
    where: { AND: [available(now), { attempts: { gte: MAX_ATTEMPTS } }] },
    data: { status: "failed", leaseUntil: null, error: "Too many attempts" },
  });

  // Compare-and-swap claim: the update only matches if nobody else claimed the
  // job since we read it (every claim bumps attempts), so it is atomic.
  for (let tries = 0; tries < 5; tries++) {
    const candidate = await prisma.printJob.findFirst({
      where: { AND: [available(now), { attempts: { lt: MAX_ATTEMPTS } }] },
      orderBy: { createdAt: "asc" },
      select: { id: true, status: true, attempts: true },
    });
    if (!candidate) break;

    const { count } = await prisma.printJob.updateMany({
      where: { id: candidate.id, status: candidate.status, attempts: candidate.attempts },
      data: { status: "printing", leaseUntil: new Date(Date.now() + LEASE_MS), attempts: { increment: 1 } },
    });
    if (count !== 1) continue;

    const job = await prisma.printJob.findUnique({ where: { id: candidate.id }, select: { id: true, type: true, data: true } });
    if (!job) continue;
    return json({ id: job.id, type: job.type, data: job.data ?? {} });
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
