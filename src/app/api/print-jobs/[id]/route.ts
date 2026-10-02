import { isObjectId, prisma } from "@/lib/db";
import { isLoggedInUser, json } from "@/lib/printAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status of one print job, polled by the page that queued it. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isLoggedInUser(request))) return json({ error: "Not signed in" }, 401);
  const { id } = await params;
  if (!isObjectId(id)) return json({ error: "Invalid job id" }, 400);

  const job = await prisma.printJob.findUnique({ where: { id }, select: { id: true, status: true, error: true } });
  if (!job) return json({ error: "Job not found" }, 404);
  return json({ id: job.id, status: job.status, error: job.error ?? null });
}
