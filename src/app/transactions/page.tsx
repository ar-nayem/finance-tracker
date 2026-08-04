import { getAccounts, getStreams, getRecentTransactions } from "@/lib/data";
import { createTransaction, deleteTransaction } from "@/lib/actions";
import { formatMoney, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [accounts, streams, transactions] = await Promise.all([
    getAccounts(),
    getStreams(),
    getRecentTransactions(50),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-8">
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

          <button
            type="submit"
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90 sm:col-span-2 lg:col-span-3 lg:w-fit"
          >
            Add transaction
          </button>
        </form>
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
                  <td className="py-2 pl-3 text-right">
                    <form action={deleteTransaction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="cursor-pointer text-xs text-foreground/40 hover:text-destructive"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-foreground/50">
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
