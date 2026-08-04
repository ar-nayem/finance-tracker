import { formatMoney } from "@/lib/format";
import {
  getStreamSummaries,
  getMonthlyTrend,
  getAccountInvestableBalances,
  getLatestRmbToBdtRate,
  getInvestmentPortfolio,
} from "@/lib/data";
import { setExchangeRate } from "@/lib/actions";
import { TrendChart } from "@/components/trend-chart";

export const dynamic = "force-dynamic";

// Salaried jobs already withhold tax; everything else is self-employment
// income and needs a manual tax reserve.
const JOB_STREAMS = new Set(["Job 1", "Job 2"]);
const TAX_RESERVE_RATE = 0.25;

export default async function DashboardPage() {
  const [summaries, { trend, streamNames }, balances, rate, investments] = await Promise.all([
    getStreamSummaries(),
    getMonthlyTrend(),
    getAccountInvestableBalances(),
    getLatestRmbToBdtRate(),
    getInvestmentPortfolio(),
  ]);

  const totalsByCurrency = summaries.reduce<Record<string, number>>((acc, s) => {
    acc[s.stream.currency] = (acc[s.stream.currency] ?? 0) + s.net;
    return acc;
  }, {});

  const combinedInBdt = rate
    ? Object.entries(totalsByCurrency).reduce((sum, [currency, net]) => {
        return sum + (currency === "RMB" ? net * rate : net);
      }, 0)
    : null;

  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const totalReturned = investments.reduce((s, i) => s + i.totalReturned, 0);
  const activeInvestments = investments.filter((i) => i.status === "active").length;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-heading text-2xl font-semibold">This Month</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Net (income − expense) per income stream, current calendar month.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaries.map(({ stream, income, expense, net }) => (
            <div key={stream.id} className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/70">{stream.name}</span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-foreground/50">
                  {stream.currency}
                </span>
              </div>
              <div
                className={`mt-2 font-heading text-2xl font-semibold ${
                  net >= 0 ? "text-accent" : "text-destructive"
                }`}
              >
                {formatMoney(net, stream.currency)}
              </div>
              <div className="mt-1 text-xs text-foreground/50">
                +{formatMoney(income, stream.currency)} / -{formatMoney(expense, stream.currency)}
              </div>
              {!JOB_STREAMS.has(stream.name) && net > 0 && (
                <div className="mt-2 text-xs text-foreground/60">
                  Reserve {formatMoney(net * TAX_RESERVE_RATE, stream.currency)} for tax (25%)
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Combined Total (this month)</h2>
            <p className="text-sm text-foreground/60">Converted to BDT using latest RMB to BDT rate.</p>
          </div>
          <form action={setExchangeRate} className="flex items-center gap-2">
            <input
              type="number"
              step="0.0001"
              name="rate"
              placeholder={rate ? String(rate) : "e.g. 17.2"}
              className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <button
              type="submit"
              className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90"
            >
              Set rate
            </button>
          </form>
        </div>
        <div className="mt-3 font-heading text-3xl font-semibold">
          {combinedInBdt !== null ? (
            formatMoney(combinedInBdt, "BDT")
          ) : (
            <span className="text-base font-normal text-foreground/50">
              Set today&apos;s exchange rate above to see a combined total.
            </span>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">6-Month Trend</h2>
        <p className="text-sm text-foreground/60">Net per stream, native currency.</p>
        <div className="mt-4">
          <TrendChart data={trend} streamNames={streamNames} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted p-4">
          <h2 className="font-heading text-lg font-semibold">Account Balances</h2>
          <p className="text-sm text-foreground/60">After money already tied up in investments/loans.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {balances.map(({ account, available }) => (
              <li key={account.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{account.name}</span>
                  <span className="ml-2 text-xs text-foreground/50">{account.role}</span>
                </div>
                <span className={available >= 0 ? "text-foreground" : "text-destructive"}>
                  {formatMoney(available, account.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-muted p-4">
          <h2 className="font-heading text-lg font-semibold">Investment Portfolio</h2>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground/60">Active investments</span>
              <span>{activeInvestments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Total capital deployed</span>
              <span>{totalInvested.toLocaleString()} (mixed currency)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/60">Total returned</span>
              <span>{totalReturned.toLocaleString()} (mixed currency)</span>
            </div>
            <a href="/investments" className="mt-2 text-sm text-primary hover:underline">
              View all investments -&gt;
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
