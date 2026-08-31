import Link from "next/link";
import {
  getAccounts,
  getStreams,
  getRecentTransactions,
  getRecentTransfers,
  getLatestRmbToBdtRate,
  getTransferFeeRules,
} from "@/lib/data";
import { createTransaction, deleteTransaction, deleteTransfer } from "@/lib/actions";
import { verifySession } from "@/lib/session";
import { formatMoney, formatDate, formatFileSize } from "@/lib/format";
import { TransferForm } from "@/components/transfer-form";
import { TransferFeeForm } from "@/components/transfer-fee-form";
import { TransactionForm } from "@/components/transaction-form";
import { ExchangeRateBanner } from "@/components/exchange-rate-banner";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { userId } = await verifySession();
  const [accounts, streams, transactions, transfers, rate, feeRules] = await Promise.all([
    getAccounts(userId),
    getStreams(userId),
    getRecentTransactions(userId, 50),
    getRecentTransfers(userId, 20),
    getLatestRmbToBdtRate(),
    getTransferFeeRules(userId),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const readyToTrack = streams.length > 0 && accounts.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <ExchangeRateBanner rate={rate} />

      {readyToTrack ? (
        <section id="add" className="card scroll-mt-20">
          <h1 className="font-heading text-lg font-semibold">Add Transaction</h1>
          <TransactionForm accounts={accounts} streams={streams} today={today} action={createTransaction} />
        </section>
      ) : (
        <section id="add" className="card-dashed scroll-mt-20">
          <p className="font-heading text-lg font-semibold">Set up streams &amp; accounts first</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/60">
            You need at least one income stream and one account before you can record a transaction.
          </p>
          <Link href="/streams" className="btn-primary mt-4 inline-block">
            Set up streams &amp; accounts
          </Link>
        </section>
      )}

      <details id="transfer" className="group card scroll-mt-20">
        <summary className="cursor-pointer font-heading text-lg font-semibold marker:content-none">
          <span className="inline-block transition-transform duration-150 group-open:rotate-90">▸</span> Transfer
          Between Accounts
        </summary>
        <p className="mt-1 text-sm text-foreground/60">Move money from one of your accounts to another.</p>
        {accounts.length >= 2 ? (
          <TransferForm accounts={accounts} today={today} suggestedRate={rate} feeRules={feeRules} />
        ) : (
          <p className="mt-4 text-sm text-foreground/50">Add at least two accounts to transfer money.</p>
        )}

        {transfers.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {transfers.map((tr) => (
              <li
                key={tr.id}
                className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{tr.fromAccount.name}</span>
                  <span className="mx-2 text-foreground/40">→</span>
                  <span className="font-medium">{tr.toAccount.name}</span>
                  <span className="ml-2 text-xs text-foreground/50">{formatDate(tr.date)}</span>
                  {tr.note && <span className="ml-2 text-xs text-foreground/50">— {tr.note}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-foreground/70">
                    {formatMoney(tr.fromAmount, tr.fromCurrency)}
                    {tr.fromCurrency !== tr.toCurrency && (
                      <span className="text-foreground/50"> → {formatMoney(tr.toAmount, tr.toCurrency)}</span>
                    )}
                    {tr.feeAmount > 0 && (
                      <span className="ml-2 text-xs text-foreground/40">
                        (fee {formatMoney(tr.feeAmount, tr.fromCurrency)})
                      </span>
                    )}
                  </span>
                  <form action={deleteTransfer}>
                    <input type="hidden" name="id" value={tr.id} />
                    <button type="submit" className="btn-ghost-sm hover:text-destructive">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {accounts.length >= 2 && <TransferFeeForm accounts={accounts} feeRules={feeRules} />}
      </details>

      <section className="card">
        <h2 className="font-heading text-lg font-semibold">Recent Transactions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-foreground/50">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Stream</th>
                <th className="py-2 pr-3 font-medium">Account</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 text-right font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Attachment</th>
                <th className="py-2 pl-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-foreground/70">{formatDate(t.date)}</td>
                  <td className="py-2 pr-3">{t.stream.name}</td>
                  <td className="py-2 pr-3 text-foreground/70">{t.account.name}</td>
                  <td className="py-2 pr-3 text-foreground/70">{t.category ?? "-"}</td>
                  <td
                    className={`py-2 pr-3 text-right ${
                      t.type === "income" ? "text-accent" : "text-destructive"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatMoney(t.amount, t.currency)}
                  </td>
                  <td className="py-2 pr-3 text-foreground/70">
                    {t.document ? (
                      <a
                        href={`/documents/${t.document.id}`}
                        className="link-primary"
                        title={`${t.document.fileName} (${formatFileSize(t.document.fileSize)})`}
                      >
                        📎 {t.document.fileName}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 pl-3">
                    <div className="flex items-center justify-end gap-3">
                      <a href={`/transactions/${t.id}/edit`} className="link-primary text-xs">
                        Edit
                      </a>
                      <a
                        href={`/transactions/${t.id}/invoice`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-primary text-xs"
                      >
                        Invoice
                      </a>
                      <form action={deleteTransaction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="btn-ghost-sm hover:text-destructive">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-foreground/50">
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details className="group card">
        <summary className="cursor-pointer font-heading text-lg font-semibold marker:content-none">
          <span className="inline-block transition-transform duration-150 group-open:rotate-90">▸</span> Account
          Statements
        </summary>
        <p className="mt-1 text-sm text-foreground/60">
          Pick a date range (or leave blank for full history) and download as CSV or PDF.
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {accounts.map((a) => (
            <li key={a.id}>
              <form className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {a.name} <span className="text-xs text-foreground/50">({a.currency})</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    name="from"
                    aria-label="From date"
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs text-foreground/40">to</span>
                  <input
                    type="date"
                    name="to"
                    aria-label="To date"
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    formAction={`/accounts/${a.id}/statement`}
                    className="btn-ghost-sm border border-border"
                  >
                    CSV
                  </button>
                  <button
                    type="submit"
                    formAction={`/accounts/${a.id}/statement/pdf`}
                    className="btn-ghost-sm border border-border"
                  >
                    PDF
                  </button>
                </div>
              </form>
            </li>
          ))}
          {accounts.length === 0 && <p className="text-sm text-foreground/50">No accounts yet.</p>}
        </ul>
      </details>
    </div>
  );
}
