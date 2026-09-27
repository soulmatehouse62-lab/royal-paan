"use client";

import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle, LogOut, MonitorSmartphone } from "lucide-react";
import { changePasswordAction, signOutAction, signOutOthersAction, type FormState } from "@/app/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";
import { useT } from "@/lib/i18n/client";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return state.error ? (
    <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{state.error}</p>
  ) : state.ok ? (
    <p role="status" className="rounded-xl bg-ok-soft px-3.5 py-2.5 text-sm font-medium text-ok">{state.ok}</p>
  ) : null;
}

export function ChangePasswordForm() {
  const t = useT();
  const [state, action, pending] = useActionState(changePasswordAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <div>
        <label htmlFor="current" className="label">{t("acc.current")}</label>
        <input id="current" name="current" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div>
        <label htmlFor="next" className="label">{t("acc.new")}</label>
        <input id="next" name="next" type="password" className="input" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
        <p className="mt-1 text-xs text-muted">{t("acc.newHint", { n: MIN_PASSWORD_LENGTH })}</p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">{t("acc.repeat")}</label>
        <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required />
      </div>
      <Message state={state} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending && <LoaderCircle size={18} className="animate-spin" />} {t("acc.changePw")}
      </button>
    </form>
  );
}

export function SessionButtons() {
  const t = useT();
  const [state, others, pending] = useActionState(signOutOthersAction, null);
  return (
    <div className="space-y-3">
      <form action={others}>
        <button className="btn-ghost w-full" disabled={pending}>
          {pending ? <LoaderCircle size={18} className="animate-spin" /> : <MonitorSmartphone size={18} />} {t("acc.signOutOthers")}
        </button>
      </form>
      <Message state={state} />
      <form action={signOutAction}>
        <button className="btn-danger w-full">
          <LogOut size={18} /> {t("acc.signOut")}
        </button>
      </form>
    </div>
  );
}
