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
        <span className="text-foreground/60">From account</span>
        <select
          name="fromAccountId"
          required
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">To account</span>
        <select
          name="toAccountId"
          required
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">Date</span>
        <input
          type="date"
          name="date"
          defaultValue={today}
          required
          className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">Amount sent{fromAccount ? ` (${fromAccount.currency})` : ""}</span>
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
          className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/60">
          Amount received{toAccount ? ` (${toAccount.currency})` : ""}
        </span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          name="toAmount"
          required={!sameCurrency}
          readOnly={sameCurrency}
          value={sameCurrency ? fromAmount : toAmount}
          onChange={(e) => setToAmount(e.target.value)}
          className={`rounded-md border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-ring ${
            sameCurrency ? "bg-muted text-foreground/60" : "bg-background"
          }`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-1">
        <span className="text-foreground/60">Note (optional)</span>
        <input
          type="text"
          name="note"
          className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <button
        type="submit"
        className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90 sm:col-span-2 lg:col-span-3 lg:w-fit"
      >
        Transfer
      </button>
    </form>
  );
}
