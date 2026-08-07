"use client";

import { useActionState } from "react";
import { createUser } from "@/lib/actions";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">Username</span>
        <input
          type="text"
          name="username"
          required
          className="w-48 rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">Initial password</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          className="w-48 rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">Role</span>
        <select
          name="role"
          defaultValue="user"
          className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create user"}
      </button>

      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-accent">{state.success}</p>}
    </form>
  );
}
