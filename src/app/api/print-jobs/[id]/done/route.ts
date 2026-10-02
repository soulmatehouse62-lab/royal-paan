import { isObjectId, prisma } from "@/lib/db";
import { isAgent, json, MAX_ATTEMPTS } from "@/lib/printAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The agent reports a result. Body: { ok, error }. Failed jobs go back to the queue until MAX_ATTEMPTS. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAgent(request)) return json({ error: "Invalid agent key" }, 401);
  const { id } = await params;
  if (!isObjectId(id)) return json({ error: "Invalid job id" }, 400);

  let body: { ok?: unknown; error?: unknown };
  try {
    body = ((await request.json()) ?? {}) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const job = await prisma.printJob.findUnique({ where: { id }, select: { attempts: true } });
  if (!job) return json({ error: "Job not found" }, 404);

  const updated = await prisma.printJob.update({
    where: { id },
    data: body.ok
      ? { status: "done", error: null, leaseUntil: null }
      : {
          status: job.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          error: String(body.error ?? "Unknown error").slice(0, 300),
          leaseUntil: null,
        },
    select: { id: true, status: true },
  });
  return json({ id: updated.id, status: updated.status });
}
