"use client";

import { useActionState, useState } from "react";
import { adminSendCustomStatement } from "@/lib/actions";

type UserOption = { id: string; username: string; email: string | null };

export function CustomStatementForm({ users }: { users: UserOption[] }) {
  const [state, formAction, pending] = useActionState(adminSendCustomStatement, undefined);
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [email, setEmail] = useState(users[0]?.email ?? "");

  // Picking a user pre-fills their current report email as a starting
  // point — still freely editable, since the recipient doesn't have to be
  // that user's own address (see the comment on adminSendCustomStatement).
  function handleUserChange(id: string) {
    setSelectedUserId(id);
    setEmail(users.find((u) => u.id === id)?.email ?? "");
  }

  if (users.length === 0) {
    return <p className="mt-4 text-sm text-foreground/50">No users to send a statement for yet.</p>;
  }

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">User</span>
        <select
          name="userId"
          value={selectedUserId}
          onChange={(e) => handleUserChange(e.target.value)}
          className="input w-36"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Send to</span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient email"
          required
          className="input w-52"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">From</span>
        <input type="date" name="from" required className="input w-40" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">To</span>
        <input type="date" name="to" required className="input w-40" />
      </label>

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Sending..." : "Send statement"}
      </button>

      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="w-full text-sm text-accent">{state.success}</p>}
    </form>
  );
}
