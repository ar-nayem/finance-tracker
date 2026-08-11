"use client";

import { useState } from "react";
import { createTransfer } from "@/lib/actions";

type TransferAccount = { id: string; name: string; currency: string };

export function TransferForm({
  accounts,
  today,
  suggestedRate,
}: {
  accounts: TransferAccount[];
  today: string;
  suggestedRate: number | null;
}) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const sameCurrency = !!fromAccount && !!toAccount && fromAccount.currency === toAccount.currency;

  function suggestToAmount(amount: string) {
    if (!suggestedRate || !fromAccount || !toAccount) return "";
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return "";
    if (fromAccount.currency === "RMB" && toAccount.currency === "BDT") return (n * suggestedRate).toFixed(2);
    if (fromAccount.currency === "BDT" && toAccount.currency === "RMB") return (n / suggestedRate).toFixed(2);
    return "";
  }

  return (
    <form action={createTransfer} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">From account</span>
        <select
          name="fromAccountId"
          required
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
          className="input"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">To account</span>
        <select
          name="toAccountId"
          required
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          className="input"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Date</span>
        <input type="date" name="date" defaultValue={today} required className="input" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Amount sent{fromAccount ? ` (${fromAccount.currency})` : ""}</span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          name="fromAmount"
          required
          value={fromAmount}
          onChange={(e) => {
            setFromAmount(e.target.value);
            setToAmount(sameCurrency ? e.target.value : suggestToAmount(e.target.value));
          }}
          className="input"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label">Amount received{toAccount ? ` (${toAccount.currency})` : ""}</span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          name="toAmount"
          required={!sameCurrency}
          readOnly={sameCurrency}
          value={sameCurrency ? fromAmount : toAmount}
          onChange={(e) => setToAmount(e.target.value)}
          className={`input ${sameCurrency ? "text-foreground/60" : ""}`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-1">
        <span className="field-label">Note (optional)</span>
        <input type="text" name="note" className="input" />
      </label>

      <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-3 lg:w-fit">
        Transfer
      </button>
    </form>
  );
}
