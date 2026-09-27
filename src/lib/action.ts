import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { ActionError } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { isMessageKey } from "@/lib/i18n";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/** Run a server action body and turn expected failures into a friendly message. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    unstable_rethrow(e); // let redirect() / notFound() through
    const t = await getT();
    if (e instanceof ActionError) return { ok: false, error: t(e.key, e.params) };
    if (e instanceof ZodError) {
      // Schemas use message keys as their messages.
      const msg = e.issues[0]?.message ?? "";
      return { ok: false, error: isMessageKey(msg) ? t(msg) : t("err.checkForm") };
    }
    console.error(e);
    return { ok: false, error: t("err.generic") };
  }
}
