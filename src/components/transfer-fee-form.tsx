"use client";

import { useState } from "react";
import { setTransferFeeRule, deleteTransferFeeRule } from "@/lib/actions";

type FeeAccount = { id: string; name: string; currency: string };
type FeeRule = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  feeType: string;
  feeValue: number;
  fromAccount: FeeAccount;
  toAccount: FeeAccount;
};

export function TransferFeeForm({ accounts, feeRules }: { accounts: FeeAccount[]; feeRules: FeeRule[] }) {
  const [feeType, setFeeType] = useState<"percent" | "fixed">("percent");

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-4">
      <h3 className="text-sm font-medium">Transfer fees</h3>
      <p className="text-xs text-foreground/50">
        Set a standing cost for moving money along one account route, e.g. 0.1% or a flat amount. Applied
        automatically the next time you transfer that way.
      </p>

      {feeRules.length > 0 && (
        <ul className="flex flex-col gap-2">
          {feeRules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{rule.fromAccount.name}</span>
                <span className="mx-2 text-foreground/40">→</span>
                <span className="font-medium">{rule.toAccount.name}</span>
                <span className="ml-2 text-xs text-foreground/50">
                  {rule.feeType === "percent" ? `${rule.feeValue}%` : `${rule.feeValue} ${rule.fromAccount.currency} flat`}
                </span>
              </div>
              <form action={deleteTransferFeeRule}>
                <input type="hidden" name="id" value={rule.id} />
                <button type="submit" className="btn-ghost-sm hover:text-destructive">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={setTransferFeeRule} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label">From account</span>
          <select name="fromAccountId" required defaultValue={accounts[0]?.id ?? ""} className="input">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label">To account</span>
          <select name="toAccountId" required defaultValue={accounts[1]?.id ?? ""} className="input">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label">Fee type</span>
          <select
            name="feeType"
            value={feeType}
            onChange={(e) => setFeeType(e.target.value as "percent" | "fixed")}
            className="input"
          >
            <option value="percent">Percent of amount sent</option>
            <option value="fixed">Flat amount</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label">{feeType === "percent" ? "Fee (%)" : "Fee (flat amount)"}</span>
          <input type="number" step="0.01" min="0" name="feeValue" required className="input" />
        </label>

        <button type="submit" className="btn-ghost-sm border border-border sm:col-span-2 lg:col-span-4 lg:w-fit">
          Save fee rule
        </button>
      </form>
    </div>
  );
}
