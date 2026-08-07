import Link from "next/link";
import { notFound } from "next/navigation";
import { getTransaction, getAccounts, getStreams } from "@/lib/data";
import { updateTransaction } from "@/lib/actions";
import { verifySession } from "@/lib/session";
import { formatFileSize } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditTransactionPage(props: PageProps<"/transactions/[id]/edit">) {
  const { userId } = await verifySession();
  const { id } = await props.params;

  const [transaction, accounts, streams] = await Promise.all([
    getTransaction(userId, id),
    getAccounts(userId),
    getStreams(userId),
  ]);
  if (!transaction) notFound();

  const dateValue = transaction.date.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/transactions" className="text-sm text-primary hover:underline">
          &lt;- Transactions
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-muted p-4">
        <h1 className="font-heading text-lg font-semibold">Edit Transaction</h1>
        <form
          action={updateTransaction}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <input type="hidden" name="id" value={transaction.id} />

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Date</span>
            <input
              type="date"
              name="date"
              defaultValue={dateValue}
              required
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Type</span>
            <select
              name="type"
              defaultValue={transaction.type}
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
              defaultValue={transaction.amount}
              required
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Stream</span>
            <select
              name="streamId"
              defaultValue={transaction.streamId}
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
              defaultValue={transaction.accountId}
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
              defaultValue={transaction.category ?? ""}
              placeholder="e.g. salary, client payment, rent"
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-3">
            <span className="text-foreground/60">Note (optional)</span>
            <input
              type="text"
              name="note"
              defaultValue={transaction.note ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-3">
            <span className="text-foreground/60">
              {transaction.document
                ? `Replace attachment (currently: ${transaction.document.fileName}, ${formatFileSize(transaction.document.fileSize)})`
                : "Attach document (optional)"}
            </span>
            <input
              type="file"
              name="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-on-primary"
            />
          </label>

          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90"
            >
              Save changes
            </button>
            <Link
              href="/transactions"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-white/5"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
