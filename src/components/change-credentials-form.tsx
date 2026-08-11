"use client";

import { useActionState } from "react";
import { changeCredentials } from "@/lib/actions";

export function ChangeCredentialsForm({ currentUsername }: { currentUsername: string }) {
  const [state, formAction, pending] = useActionState(changeCredentials, undefined);

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Current password</span>
        <input type="password" name="currentPassword" required className="input w-48" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Username</span>
        <input type="text" name="newUsername" defaultValue={currentUsername} required className="input w-48" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">New password (optional)</span>
        <input
          type="password"
          name="newPassword"
          placeholder="leave blank to keep current"
          className="input w-56"
        />
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Update login"}
      </button>

      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-accent">{state.success}</p>}
    </form>
  );
}
