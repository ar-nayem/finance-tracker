"use client";

import { useActionState } from "react";
import { changeCredentials } from "@/lib/actions";

export function ChangeCredentialsForm({ currentUsername }: { currentUsername: string }) {
  const [state, formAction, pending] = useActionState(changeCredentials, undefined);

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">Current password</span>
        <input
          type="password"
          name="currentPassword"
          required
          className="w-48 rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">Username</span>
        <input
          type="text"
          name="newUsername"
          defaultValue={currentUsername}
          required
          className="w-48 rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">New password (optional)</span>
        <input
          type="password"
          name="newPassword"
          placeholder="leave blank to keep current"
          className="w-56 rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : "Update login"}
      </button>

      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-accent">{state.success}</p>}
    </form>
  );
}
