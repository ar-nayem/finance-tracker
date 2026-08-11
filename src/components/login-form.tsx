"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Username</span>
        <input type="text" name="username" autoFocus required className="input" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Password</span>
        <input type="password" name="password" required className="input" />
      </label>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
