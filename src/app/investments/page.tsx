import { getAccountInvestableBalances, getInvestmentPortfolio } from "@/lib/data";
import { createInvestment, createInvestmentReturn, updateInvestmentStatus } from "@/lib/actions";
import { formatMoney, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["active", "exited", "lost"] as const;
const TYPE_OPTIONS = ["Equity", "Loan", "Profit-share", "Other"] as const;

export default async function InvestmentsPage() {
  const [accountBalances, investments] = await Promise.all([
    getAccountInvestableBalances(),
    getInvestmentPortfolio(),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const totalReturned = investments.reduce((s, i) => s + i.totalReturned, 0);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-border bg-muted p-4">
        <h1 className="font-heading text-lg font-semibold">Add Investment or Loan</h1>
        <p className="text-sm text-foreground/60">
          Covers both business investments and money you lend to people. Funded from an
          account&apos;s actual balance only, never straight from a job or business stream.
        </p>
        <form action={createInvestment} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Name</span>
            <input
              type="text"
              name="name"
              placeholder="e.g. Friend's restaurant, or Loan to Karim"
              required
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-foreground/60">Amount invested</span>
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
            <span className="text-foreground/60">Funded by</span>
            <select
              name="accountId"
              required
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            >
              {accountBalances.map(({ account, available }) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatMoney(available, account.currency)} available
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
            <span className="text-foreground/60">Type (optional)</span>
            <select
              name="type"
              defaultValue=""
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Unspecified</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-1">
            <span className="text-foreground/60">Notes (optional)</span>
            <input
              type="text"
              name="notes"
              className="rounded-md border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <button
            type="submit"
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90 sm:col-span-2 lg:col-span-3 lg:w-fit"
          >
            Add investment
          </button>
        </form>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="text-sm text-foreground/60">Total capital deployed</div>
          <div className="mt-1 font-heading text-2xl font-semibold">
            {totalInvested.toLocaleString()} (mixed currency)
          </div>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="text-sm text-foreground/60">Total returned</div>
          <div className="mt-1 font-heading text-2xl font-semibold text-accent">
            {totalReturned.toLocaleString()} (mixed currency)
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold">All Investments &amp; Loans</h2>
        {investments.map((inv) => (
          <div key={inv.id} className="rounded-lg border border-border bg-muted p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium">{inv.name}</div>
                <div className="text-xs text-foreground/50">
                  {formatDate(inv.date)} • funded by {inv.account.name} • {inv.type ?? "unspecified type"}
                </div>
                {inv.notes && <div className="mt-1 text-sm text-foreground/60">{inv.notes}</div>}
              </div>
              <form action={updateInvestmentStatus} className="flex items-center gap-2">
                <input type="hidden" name="id" value={inv.id} />
                <select
                  name="status"
                  defaultValue={inv.status}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs text-foreground/70 hover:bg-white/5"
                >
                  Update
                </button>
              </form>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-xs text-foreground/50">Invested</div>
                <div>{formatMoney(inv.amount, inv.currency)}</div>
              </div>
              <div>
                <div className="text-xs text-foreground/50">Returned</div>
                <div>{formatMoney(inv.totalReturned, inv.currency)}</div>
              </div>
              <div>
                <div className="text-xs text-foreground/50">ROI</div>
                <div className={inv.roi >= 0 ? "text-accent" : "text-destructive"}>
                  {(inv.roi * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-foreground/50">Status</div>
                <div className="capitalize">{inv.status}</div>
              </div>
            </div>

            <form action={createInvestmentReturn} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="investmentId" value={inv.id} />
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-foreground/50">Return date</span>
                <input
                  type="date"
                  name="date"
                  defaultValue={today}
                  required
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-foreground/50">Amount received</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  required
                  className="w-32 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <button
                type="submit"
                className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-white/5"
              >
                Log return
              </button>
            </form>
          </div>
        ))}
        {investments.length === 0 && (
          <p className="text-sm text-foreground/50">No investments logged yet.</p>
        )}
      </section>
    </div>
  );
}
