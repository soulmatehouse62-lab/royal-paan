export type PrintJobType = "kot" | "bill" | "test";

const POLL_MS = 1500;

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) return body.error;
  } catch {}
  return `Server error ${res.status}`;
}

/**
 * Queue a ticket for the shop printer and wait for the print agent.
 * Resolves "done" once printed, or "queued" if the agent hasn't printed it
 * within waitMs (it stays in the queue). Throws if the job failed.
 */
export async function sendToPrinter(
  type: PrintJobType,
  data: Record<string, unknown>,
  { waitMs = 20000 }: { waitMs?: number } = {},
): Promise<"done" | "queued"> {
  const res = await fetch("/api/print-jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, data }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await readError(res));
  const { id } = (await res.json()) as { id: string };

  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const poll = await fetch(`/api/print-jobs/${id}`, { cache: "no-store" }).catch(() => null);
    if (!poll?.ok) continue; // network blip on mobile data: keep trying until the deadline
    const job = (await poll.json()) as { status: string; error: string | null };
    if (job.status === "done") return "done";
    if (job.status === "failed") throw new Error(job.error || "Print failed");
  }
  return "queued";
}
