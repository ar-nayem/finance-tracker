"use client";

import { useActionState } from "react";
import { createUser } from "@/lib/actions";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Username</span>
        <input type="text" name="username" required className="input w-48" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Initial password</span>
        <input type="password" name="password" required minLength={8} className="input w-48" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Role</span>
        <select name="role" defaultValue="user" className="input">
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Creating..." : "Create user"}
      </button>

      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-accent">{state.success}</p>}
    </form>
  );
}
