"use client";

import { useState } from "react";

type FormAccount = { id: string; name: string; currency: string };
type FormStream = { id: string; name: string; currency: string };

type DefaultValues = {
  id?: string;
  date?: string;
  type?: "income" | "expense";
  amount?: number;
  streamId?: string;
  accountId?: string;
  category?: string;
  note?: string;
  documentLabel?: string;
};

// A transaction's amount is stored in its funding account's currency, and
// every stream total assumes all of a stream's transactions share the
// stream's own currency — so the account list here is filtered to only
// accounts matching the selected stream's currency. Picking a mismatched
// pair would silently corrupt stream/report totals (see actions.ts's
// matching check, which backs this up server-side too).
export function TransactionForm({
  accounts,
  streams,
  today,
  action,
  defaultValues,
  submitLabel = "Add transaction",
}: {
  accounts: FormAccount[];
  streams: FormStream[];
  today: string;
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: DefaultValues;
  submitLabel?: string;
}) {
  const [streamId, setStreamId] = useState(defaultValues?.streamId ?? streams[0]?.id ?? "");
  const stream = streams.find((s) => s.id === streamId);
  const matchingAccounts = accounts.filter((a) => !stream || a.currency === stream.currency);

  const initialAccountId =
    defaultValues?.accountId && matchingAccounts.some((a) => a.id === defaultValues.accountId)
      ? defaultValues.accountId
      : (matchingAccounts[0]?.id ?? "");
  const [accountId, setAccountId] = useState(initialAccountId);

  function onStreamChange(newStreamId: string) {
    setStreamId(newStreamId);
    const newStream = streams.find((s) => s.id === newStreamId);
    const stillValid = accounts.find((a) => a.id === accountId && a.currency === newStream?.currency);
    if (!stillValid) {
      const firstMatch = accounts.find((a) => a.currency === newStream?.currency);
      setAccountId(firstMatch?.id ?? "");
    }
  }

  return (
    <form action={action} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Date</span>
        <input type="date" name="date" defaultValue={defaultValues?.date ?? today} required className="input" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Transaction Type</span>
        <select name="type" defaultValue={defaultValues?.type ?? "income"} required className="input">
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Amount</span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          name="amount"
          defaultValue={defaultValues?.amount}
          required
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Stream</span>
        <select
          name="streamId"
          required
          className="input"
          value={streamId}
          onChange={(e) => onStreamChange(e.target.value)}
        >
          {streams.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.currency})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Account{stream ? ` (${stream.currency} only)` : ""}</span>
        <select
          name="accountId"
          required
          className="input"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {matchingAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
        {matchingAccounts.length === 0 && (
          <span className="text-xs text-destructive">
            No {stream?.currency} account yet — add one before logging this stream.
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Category (optional)</span>
        <input
          type="text"
          name="category"
          defaultValue={defaultValues?.category ?? ""}
          placeholder="e.g. salary, client payment, rent"
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-3">
        <span className="field-label">Note (optional)</span>
        <input type="text" name="note" defaultValue={defaultValues?.note ?? ""} className="input" />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-3">
        <span className="field-label">{defaultValues?.documentLabel ?? "Add receipt (optional)"}</span>
        <input
          type="file"
          name="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
          className="input-file"
        />
      </label>

      <button
        type="submit"
        disabled={matchingAccounts.length === 0}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-3 lg:w-fit"
      >
        {submitLabel}
      </button>
    </form>
  );
}
