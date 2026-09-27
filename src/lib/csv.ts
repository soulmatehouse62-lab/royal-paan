import "server-only";

/** Quote a CSV cell and neutralise spreadsheet formulas (=, +, -, @ at the start). */
export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) || s.startsWith("'") ? `"${s.replace(/"/g, '""')}"` : s;
}

export const csvRow = (cells: (string | number | null | undefined)[]) => cells.map(csvCell).join(",") + "\r\n";

/**
 * Stream CSV in batches, so large exports never sit in memory at once.
 * `next(cursor)` returns the next batch of rows and the cursor to continue from.
 */
export function csvResponse(
  filename: string,
  header: string[],
  next: (cursor: string | undefined) => Promise<{ rows: string[]; cursor: string | undefined }>,
): Response {
  const enc = new TextEncoder();
  let cursor: string | undefined;
  let started = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (!started) {
          started = true;
          controller.enqueue(enc.encode("﻿" + csvRow(header))); // BOM so Excel reads ₹ correctly
          return;
        }
        const batch = await next(cursor);
        if (batch.rows.length) controller.enqueue(enc.encode(batch.rows.join("")));
        cursor = batch.cursor;
        if (!cursor) controller.close();
      } catch (e) {
        console.error("CSV export failed", e);
        controller.error(e);
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export const rupees = (paise: number) => (paise / 100).toFixed(2);
