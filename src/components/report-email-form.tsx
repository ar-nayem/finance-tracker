"use client";

import { useActionState } from "react";
import { updateReportEmail } from "@/lib/actions";

export function ReportEmailForm({ currentEmail }: { currentEmail: string | null }) {
  const [state, formAction, pending] = useActionState(updateReportEmail, undefined);

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Report email</span>
        <input
          type="email"
          name="email"
          defaultValue={currentEmail ?? ""}
          placeholder="you@example.com"
          className="input w-64"
        />
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Save"}
      </button>

      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-accent">{state.success}</p>}
    </form>
  );
}
