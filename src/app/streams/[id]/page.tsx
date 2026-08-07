import Link from "next/link";
import { notFound } from "next/navigation";
import { getStreamDetail, getStreamTrend, resolveRangeSelection, describeRange } from "@/lib/data";
import { formatMoney, formatDate, formatFileSize } from "@/lib/format";
import { PeriodPicker } from "@/components/period-picker";
import { PieChartCard } from "@/components/pie-chart-card";
import { TrendChart } from "@/components/trend-chart";
import { verifySession } from "@/lib/session";

export const dynamic = "force-dynamic";

const TREND_SERIES = ["Income", "Expense", "Net"];

export default async function StreamDetailPage(props: PageProps<"/streams/[id]">) {
  const { userId } = await verifySession();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const selection = resolveRangeSelection(searchParams);
  const rangeLabel = describeRange(selection);

  const detail = await getStreamDetail(userId, id, selection).catch(() => null);
  if (!detail) notFound();
  const trend = await getStreamTrend(userId, id, selection);

  const { stream, transactions, income, expense, net, categoryBreakdown, incomeCategoryBreakdown } = detail;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/" className="text-sm text-primary hover:underline">
          &lt;- Dashboard
        </Link>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold">
              {stream.name}{" "}
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-sm font-normal text-foreground/50">
                {stream.currency}
              </span>
            </h1>
            <p className="mt-1 text-sm text-foreground/60">{rangeLabel} — full income &amp; expense detail.</p>
          </div>
          <PeriodPicker basePath={`/streams/${id}`} selection={selection} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="text-sm text-foreground/60">Income</div>
          <div className="mt-1 font-heading text-2xl font-semibold text-accent">
            {formatMoney(income, stream.currency)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="text-sm text-foreground/60">Expense</div>
          <div className="mt-1 font-heading text-2xl font-semibold text-destructive">
            {formatMoney(expense, stream.currency)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="text-sm text-foreground/60">Net</div>
          <div
            className={`mt-1 font-heading text-2xl font-semibold ${net >= 0 ? "text-accent" : "text-destructive"}`}
          >
            {formatMoney(net, stream.currency)}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">{rangeLabel} Trend</h2>
        <p className="text-sm text-foreground/60">Income, expense and net over time, {stream.currency}.</p>
        <div className="mt-4">
          <TrendChart data={trend} streamNames={TREND_SERIES} />
        </div>
      </section>

      {(categoryBreakdown.length > 0 || incomeCategoryBreakdown.length > 0) && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {categoryBreakdown.length > 0 && (
            <PieChartCard title="Spending by Category" data={categoryBreakdown} currency={stream.currency} />
          )}
          {incomeCategoryBreakdown.length > 0 && (
            <PieChartCard title="Income by Category" data={incomeCategoryBreakdown} currency={stream.currency} />
          )}
        </section>
      )}

      <section className="rounded-lg border border-border bg-muted p-4">
        <h2 className="font-heading text-lg font-semibold">Transactions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-foreground/50">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Account</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Note</th>
                <th className="py-2 pr-3 text-right font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Attachment</th>
                <th className="py-2 pl-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="py-2 pr-3 text-foreground/70">{formatDate(t.date)}</td>
                  <td className="py-2 pr-3 text-foreground/70">{t.account.name}</td>
                  <td className="py-2 pr-3 text-foreground/70">{t.category ?? "-"}</td>
                  <td className="py-2 pr-3 text-foreground/70">{t.note ?? "-"}</td>
                  <td
                    className={`py-2 pr-3 text-right ${t.type === "income" ? "text-accent" : "text-destructive"}`}
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
                  <td className="py-2 pl-3 text-right">
                    <a
                      href={`/transactions/${t.id}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Invoice
                    </a>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-foreground/50">
                    No transactions in this period.
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
