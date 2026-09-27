"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { signInAction } from "@/app/actions/auth";
import { useT } from "@/lib/i18n/client";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, null);
  const t = useT();
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="username" className="label">
          {t("login.username")}
        </label>
        <input id="username" name="username" defaultValue={state?.username} className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus={!state?.username} />
      </div>
      <div>
        <label htmlFor="password" className="label">
          {t("login.password")}
        </label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required autoFocus={Boolean(state?.username)} />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={pending}>
        {pending && <LoaderCircle size={18} className="animate-spin" />}
        {t("login.submit")}
      </button>
    </form>
  );
}
