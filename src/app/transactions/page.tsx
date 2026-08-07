import {
  getAccounts,
  getStreams,
  getRecentTransactions,
  getRecentTransfers,
  getLatestRmbToBdtRate,
} from "@/lib/data";
import { createTransaction, deleteTransaction, deleteTransfer } from "@/lib/actions";
import { verifySession } from "@/lib/session";
import { formatMoney, formatDate, formatFileSize } from "@/lib/format";
import { TransferForm } from "@/components/transfer-form";
import { ExchangeRateBanner } from "@/components/exchange-rate-banner";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { userId } = await verifySession();
  const [accounts, streams, transactions, transfers, rate] = await Promise.all([
    getAccounts(userId),
    getStreams(userId),
    getRecentTransactions(userId, 50),
    getRecentTransfers(userId, 20),
    getLatestRmbToBdtRate(),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-8">
      <ExchangeRateBanner rate={rate} />

      <section className="rounded-lg border border-border bg-muted p-4">
        <h1 className="font-heading text-lg font-semibold">Add Transaction</h1>
        <form action={createTransaction} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            <span className="text-foreground/60">Type</span>
            <select
              name="type"
              required
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Amount</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              required
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Stream</span>
            <select
              name="streamId"
              required
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            >
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.currency})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Account</span>
            <select
              name="accountId"
              required
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
            <span className="text-foreground/60">Category (optional)</span>
            <input
              type="text"
              name="category"
              placeholder="e.g. salary, client payment, rent"
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-3">
            <span className="text-foreground/60">Note (optional)</span>
            <input
              type="text"
              name="note"
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-3">
            <span className="text-foreground/60">Attach document (optional)</span>
            <input
              type="file"
              name="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-on-primary"
            />
          </label>

          <button
            type="submit"
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90 sm:col-span-2 lg:col-span-3 lg:w-fit"
          >
            Add transaction
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">Transfer Between Accounts</h2>
        <p className="mt-1 text-sm text-foreground/60">Move money from one of your accounts to another.</p>
        {accounts.length >= 2 ? (
          <TransferForm accounts={accounts} today={today} suggestedRate={rate} />
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
                  </span>
                  <form action={deleteTransfer}>
                    <input type="hidden" name="id" value={tr.id} />
                    <button
                      type="submit"
                      className="cursor-pointer text-xs text-foreground/40 hover:text-destructive"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
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
                        className="text-primary hover:underline"
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
                      <a href={`/transactions/${t.id}/edit`} className="text-xs text-primary hover:underline">
                        Edit
                      </a>
                      <a
                        href={`/transactions/${t.id}/invoice`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Invoice
                      </a>
                      <form action={deleteTransaction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          className="cursor-pointer text-xs text-foreground/40 hover:text-destructive"
                        >
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

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">Account Statements</h2>
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
                    className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground/80 hover:bg-white/5"
                  >
                    CSV
                  </button>
                  <button
                    type="submit"
                    formAction={`/accounts/${a.id}/statement/pdf`}
                    className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground/80 hover:bg-white/5"
                  >
                    PDF
                  </button>
                </div>
              </form>
            </li>
          ))}
          {accounts.length === 0 && <p className="text-sm text-foreground/50">No accounts yet.</p>}
        </ul>
      </section>
    </div>
  );
}
