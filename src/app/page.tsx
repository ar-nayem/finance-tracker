import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/format";
import {
  getStreams,
  getStreamSummariesForPeriod,
  getTrend,
  getCategoryBreakdown,
  getIncomeBreakdown,
  getAccountInvestableBalances,
  getLatestRmbToBdtRate,
  getInvestmentPortfolio,
  getRecentTransactions,
  resolveRangeSelection,
  describeRange,
} from "@/lib/data";
import { setExchangeRate } from "@/lib/actions";
import { verifySession } from "@/lib/session";
import { TrendChart } from "@/components/trend-chart";
import { PieChartCard } from "@/components/pie-chart-card";
import { PeriodPicker } from "@/components/period-picker";

export const dynamic = "force-dynamic";

// Salaried jobs already withhold tax; everything else is self-employment
// income and needs a manual tax reserve.
const JOB_STREAMS = new Set(["Job 1", "Job 2"]);
const TAX_RESERVE_RATE = 0.25;

type SearchParams = Record<string, string | string[] | undefined>;

// Every tab/toggle link on this page (trend currency, breakdown tab, stream
// drill-in) needs to carry forward the current range and every other choice
// already made — otherwise clicking one toggle silently resets another.
function buildQuery(current: SearchParams, overrides: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined) params.set(key, v);
  }
  for (const [key, value] of Object.entries(overrides)) {
    params.set(key, value);
  }
  return params.toString();
}

export default async function DashboardPage(props: PageProps<"/">) {
  const { userId } = await verifySession();
  const searchParams = await props.searchParams;
  const selection = resolveRangeSelection(searchParams);
  const rangeLabel = describeRange(selection);

  const [streams, summaries, { trend, streamNames }, categoryBreakdown, incomeBreakdown, balances, rate, investments, recentTransactions] =
    await Promise.all([
      getStreams(userId),
      getStreamSummariesForPeriod(userId, selection),
      getTrend(userId, selection),
      getCategoryBreakdown(userId, selection),
      getIncomeBreakdown(userId, selection),
      getAccountInvestableBalances(userId),
      getLatestRmbToBdtRate(),
      getInvestmentPortfolio(userId),
      getRecentTransactions(userId, 5),
    ]);

  // Real net worth: what's actually sitting in every account right now
  // (after money already tied up in investments), not the selected period's
  // income/expense — that's a separate "this period" view further down.
  const netWorthByCurrency = balances.reduce<Record<string, number>>((acc, { account, available }) => {
    acc[account.currency] = (acc[account.currency] ?? 0) + available;
    return acc;
  }, {});
  const netWorthInBdt = rate
    ? Object.entries(netWorthByCurrency).reduce((sum, [currency, amount]) => {
        return sum + (currency === "RMB" ? amount * rate : amount);
      }, 0)
    : null;

  const totalInvested = investments.reduce((s, i) => s + i.totalInvested, 0);
  const totalReturned = investments.reduce((s, i) => s + i.totalReturned, 0);
  const activeInvestments = investments.filter((i) => i.status === "active").length;

  const streamHref = (id: string) => `/streams/${id}?${buildQuery(searchParams, {})}`;

  // Every stream still shown on its own line, but converted into whichever
  // single currency is toggled — RMB and BDT streams otherwise sit on the
  // same axis at wildly different scales and aren't comparable as-is.
  const currencyByStream = new Map(streams.map((s) => [s.name, s.currency]));
  const trendCurrencyRaw = Array.isArray(searchParams.tc) ? searchParams.tc[0] : searchParams.tc;
  const trendCurrency: "RMB" | "BDT" = trendCurrencyRaw === "BDT" ? "BDT" : "RMB";
  const displayTrend = trend.map((row) => {
    const converted: Record<string, string | number> = { label: row.label };
    for (const name of streamNames) {
      const value = Number(row[name] ?? 0);
      const streamCurrency = currencyByStream.get(name);
      if (!rate || streamCurrency === trendCurrency) {
        converted[name] = value;
      } else if (streamCurrency === "RMB" && trendCurrency === "BDT") {
        converted[name] = Math.round(value * rate * 100) / 100;
      } else {
        converted[name] = Math.round((value / rate) * 100) / 100;
      }
    }
    return converted;
  });

  const breakdownTabRaw = Array.isArray(searchParams.breakdown) ? searchParams.breakdown[0] : searchParams.breakdown;
  const breakdownTab: "spending" | "income" = breakdownTabRaw === "income" ? "income" : "spending";
  const activeBreakdown = breakdownTab === "income" ? incomeBreakdown : categoryBreakdown;
  const breakdownTitle = breakdownTab === "income" ? "Income by Category" : "Spending by Category";
  const breakdownEmptyText = breakdownTab === "income" ? "No income in this period." : "No expenses in this period.";

  return (
    <div className="flex flex-col gap-8">
      <section className="card-hero">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="stat-label">Your total net worth</p>
            <p className="mt-2 font-heading text-4xl font-semibold sm:text-5xl">
              {netWorthInBdt !== null ? (
                formatMoney(netWorthInBdt, "BDT")
              ) : (
                <span className="text-2xl font-normal text-foreground/50">Set the exchange rate to see this</span>
              )}
            </p>
            {Object.entries(netWorthByCurrency).length > 0 && (
              <p className="mt-2 text-sm text-foreground/50">
                {Object.entries(netWorthByCurrency)
                  .map(([currency, amount]) => formatMoney(amount, currency))
                  .join(" + ")}{" "}
                across your accounts
              </p>
            )}
          </div>
          <form action={setExchangeRate} className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-foreground/50">RMB → BDT rate</span>
              <input
                type="number"
                step="0.0001"
                name="rate"
                placeholder={rate ? String(rate) : "e.g. 17.2"}
                className="input w-32 py-2"
                required
              />
            </label>
            <button type="submit" className="btn-secondary px-4 py-2">
              {rate ? "Update rate" : "Set rate"}
            </button>
          </form>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Link href="/transactions#add" className="btn-primary">
          + Add transaction
        </Link>
        <Link href="/transactions#transfer" className="btn-secondary">
          Transfer between accounts
        </Link>
        <Link href="/investments#add" className="btn-secondary">
          + Add investment
        </Link>
      </section>

      <section className="card">
        <h2 className="font-heading text-lg font-semibold">Your Accounts</h2>
        <p className="text-sm text-foreground/60">Where your money physically lives, after anything tied up in investments.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {balances.map(({ account, available }) => (
            <li key={account.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{account.name}</span>
                <span className="badge ml-2">{account.role}</span>
              </div>
              <span className={available >= 0 ? "text-foreground" : "text-destructive"}>
                {formatMoney(available, account.currency)}
              </span>
            </li>
          ))}
          {balances.length === 0 && (
            <li className="text-sm text-foreground/50">
              No accounts yet —{" "}
              <Link href="/streams" className="link-primary">
                add one
              </Link>
              .
            </li>
          )}
        </ul>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-semibold">{rangeLabel}</h2>
            <p className="mt-1 text-sm text-foreground/60">Net (income − expense) per income stream, this period.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PeriodPicker basePath="/" selection={selection} />
          </div>
        </div>

        {streams.length === 0 ? (
          <div className="card-dashed mt-4">
            <p className="font-heading text-lg font-semibold">No income streams yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-foreground/60">
              Add an income stream and an account to start tracking money in and out.
            </p>
            <Link href="/streams" className="btn-primary mt-4 inline-block">
              Set up streams &amp; accounts
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaries.map(({ stream, income, expense, net }) => (
              <Link key={stream.id} href={streamHref(stream.id)} className="card transition-colors duration-150 hover:border-primary/50 hover:bg-muted-hover">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground/70">{stream.name}</span>
                  <span className="badge">{stream.currency}</span>
                </div>
                <div className={`stat-value ${net >= 0 ? "text-accent" : "text-destructive"}`}>
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
                <div className="mt-2 text-xs text-primary">View details -&gt;</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">{rangeLabel} Trend</h2>
            <p className="text-sm text-foreground/60">
              Net per stream, shown in {trendCurrency}
              {!rate && " — set the exchange rate above for accurate conversion"}.
            </p>
          </div>
          <div className="flex gap-1">
            {(["RMB", "BDT"] as const).map((c) => (
              <Link
                key={c}
                href={`/?${buildQuery(searchParams, { tc: c })}`}
                scroll={false}
                className={`pill ${trendCurrency === c ? "pill-active" : "pill-inactive"}`}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <TrendChart data={displayTrend} streamNames={streamNames} />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">{breakdownTitle}</h2>
            <p className="mt-1 text-sm text-foreground/60">
              {rangeLabel}, {breakdownTab} only.
            </p>
          </div>
          <div className="flex gap-1">
            {(
              [
                ["spending", "Spending"],
                ["income", "Income"],
              ] as const
            ).map(([tab, label]) => (
              <Link
                key={tab}
                href={`/?${buildQuery(searchParams, { breakdown: tab })}`}
                scroll={false}
                className={`pill ${breakdownTab === tab ? "pill-active" : "pill-inactive"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {activeBreakdown.map(({ currency, data }) => (
            <PieChartCard key={currency} title={breakdownTitle} data={data} currency={currency} />
          ))}
          {activeBreakdown.length === 0 && <p className="text-sm text-foreground/50">{breakdownEmptyText}</p>}
        </div>
      </section>

      <section className="card">
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
          <Link href="/investments" className="link-primary mt-2">
            View all investments -&gt;
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Recent Activity</h2>
          <Link href="/transactions" className="link-primary">
            View all transactions -&gt;
          </Link>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {recentTransactions.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between border-b border-border/50 pb-2 text-sm last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-foreground/50">{formatDate(t.date)}</span>
                <span className="font-medium">{t.category ?? t.stream.name}</span>
                <span className="badge hidden sm:inline">{t.stream.name}</span>
              </div>
              <span className={t.type === "income" ? "text-accent" : "text-destructive"}>
                {t.type === "income" ? "+" : "-"}
                {formatMoney(t.amount, t.currency)}
              </span>
            </li>
          ))}
          {recentTransactions.length === 0 && <li className="text-sm text-foreground/50">No transactions yet.</li>}
        </ul>
      </section>
    </div>
  );
}
