import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
} from "date-fns";
import { formatDate } from "@/lib/format";

export type Period = "1w" | "1m" | "3m" | "6m" | "1y" | "2y";

export const PERIOD_LABELS: Record<Period, string> = {
  "1w": "Past Week",
  "1m": "Past Month",
  "3m": "Past 3 Months",
  "6m": "Past 6 Months",
  "1y": "Past Year",
  "2y": "Past 2 Years",
};

// A time window is either one of the fixed presets above, or a custom
// from/to range the user picked themselves. Every dashboard query takes this
// instead of a bare Period so "custom" isn't a bolted-on special case.
export type RangeSelection = { kind: "preset"; period: Period } | { kind: "custom"; from: Date; to: Date };

function firstOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Custom range wins whenever both `from` and `to` are present and valid;
// otherwise falls back to the period preset (defaulting to "1m").
export function resolveRangeSelection(searchParams: {
  period?: string | string[];
  from?: string | string[];
  to?: string | string[];
}): RangeSelection {
  const fromRaw = firstOf(searchParams.from);
  const toRaw = firstOf(searchParams.to);
  if (fromRaw && toRaw) {
    const from = startOfDay(new Date(fromRaw));
    const to = endOfDay(new Date(toRaw));
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      return { kind: "custom", from, to };
    }
  }
  const periodRaw = firstOf(searchParams.period);
  const period = periodRaw !== undefined && periodRaw in PERIOD_LABELS ? (periodRaw as Period) : "1m";
  return { kind: "preset", period };
}

export function describeRange(selection: RangeSelection): string {
  return selection.kind === "preset"
    ? PERIOD_LABELS[selection.period]
    : `${formatDate(selection.from)} – ${formatDate(selection.to)}`;
}

type Bucket = "day" | "week" | "month";

// Bucket granularity scales with range length so the trend chart stays
// readable — daily points for short windows, weekly for a quarter, monthly
// once we're into multi-month territory.
function periodConfig(period: Period): { start: Date; end: Date; bucket: Bucket } {
  const end = endOfDay(new Date());
  switch (period) {
    case "1w":
      return { start: startOfDay(subDays(end, 6)), end, bucket: "day" };
    case "1m":
      return { start: startOfDay(subDays(end, 29)), end, bucket: "day" };
    case "3m":
      return { start: startOfDay(subWeeks(end, 12)), end, bucket: "week" };
    case "6m":
      return { start: startOfMonth(subMonths(end, 5)), end, bucket: "month" };
    case "1y":
      return { start: startOfMonth(subMonths(end, 11)), end, bucket: "month" };
    case "2y":
      return { start: startOfMonth(subMonths(end, 23)), end, bucket: "month" };
  }
}

function rangeConfig(selection: RangeSelection): { start: Date; end: Date; bucket: Bucket } {
  if (selection.kind === "preset") return periodConfig(selection.period);
  const days = differenceInCalendarDays(selection.to, selection.from);
  const bucket: Bucket = days <= 31 ? "day" : days <= 180 ? "week" : "month";
  return { start: selection.from, end: selection.to, bucket };
}

export async function getStreams() {
  return prisma.stream.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getCredentialUsername() {
  const credential = await prisma.appCredential.findFirst();
  return credential?.username ?? null;
}

export async function getStreamsWithTransactionCounts() {
  const streams = await getStreams();
  return Promise.all(
    streams.map(async (stream) => {
      const transactionCount = await prisma.transaction.count({ where: { streamId: stream.id } });
      return { stream, transactionCount };
    })
  );
}

export async function getAccounts() {
  return prisma.account.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getAccountsWithUsageCounts() {
  const accounts = await getAccounts();
  return Promise.all(
    accounts.map(async (account) => {
      const [transactionCount, investmentCount, transferCount] = await Promise.all([
        prisma.transaction.count({ where: { accountId: account.id } }),
        prisma.investment.count({ where: { accountId: account.id } }),
        prisma.transfer.count({
          where: { OR: [{ fromAccountId: account.id }, { toAccountId: account.id }] },
        }),
      ]);
      return { account, transactionCount, investmentCount, transferCount };
    })
  );
}

export async function getLatestRmbToBdtRate() {
  const rate = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: "RMB", toCurrency: "BDT" },
    orderBy: { date: "desc" },
  });
  return rate?.rate ?? null;
}

export async function getStreamSummariesForPeriod(selection: RangeSelection) {
  const streams = await getStreams();
  const { start, end } = rangeConfig(selection);

  const summaries = await Promise.all(
    streams.map(async (stream) => {
      const transactions = await prisma.transaction.findMany({
        where: { streamId: stream.id, date: { gte: start, lte: end } },
      });
      const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      return { stream, income, expense, net: income - expense };
    })
  );

  return summaries;
}

export async function getTrend(selection: RangeSelection) {
  const streams = await getStreams();
  const { start, end, bucket } = rangeConfig(selection);
  const spansMultipleYears = differenceInCalendarDays(end, start) > 366;

  const buckets =
    bucket === "day"
      ? eachDayOfInterval({ start, end }).map((d) => ({
          start: startOfDay(d),
          end: endOfDay(d),
          label: format(d, "MMM d"),
        }))
      : bucket === "week"
        ? eachWeekOfInterval({ start, end }).map((d) => ({
            start: startOfWeek(d),
            end: endOfWeek(d),
            label: format(d, "MMM d"),
          }))
        : eachMonthOfInterval({ start, end }).map((d) => ({
            start: startOfMonth(d),
            end: endOfMonth(d),
            label: format(d, spansMultipleYears ? "MMM ''yy" : "MMM"),
          }));

  const trend = await Promise.all(
    buckets.map(async (b) => {
      const row: Record<string, string | number> = { label: b.label };

      for (const stream of streams) {
        const transactions = await prisma.transaction.findMany({
          where: { streamId: stream.id, date: { gte: b.start, lte: b.end } },
        });
        const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        row[stream.name] = income - expense;
      }

      return row;
    })
  );

  return { trend, streamNames: streams.map((s) => s.name) };
}

// Expense totals by category, split per currency (mixing currencies in one
// pie would misrepresent the split), for the "Spending by Category" chart.
export async function getCategoryBreakdown(selection: RangeSelection) {
  const { start, end } = rangeConfig(selection);
  const transactions = await prisma.transaction.findMany({
    where: { type: "expense", date: { gte: start, lte: end } },
  });

  const byCurrency = new Map<string, Map<string, number>>();
  for (const t of transactions) {
    const categoryTotals = byCurrency.get(t.currency) ?? new Map<string, number>();
    const key = t.category ?? "Uncategorized";
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + t.amount);
    byCurrency.set(t.currency, categoryTotals);
  }

  return [...byCurrency.entries()].map(([currency, totals]) => ({
    currency,
    data: [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
  }));
}

// Income totals by category, split per currency — same shape and grouping
// key as getCategoryBreakdown (below), just for income instead of expenses,
// so the two pies are directly parallel.
export async function getIncomeBreakdown(selection: RangeSelection) {
  const { start, end } = rangeConfig(selection);
  const transactions = await prisma.transaction.findMany({
    where: { type: "income", date: { gte: start, lte: end } },
  });

  const byCurrency = new Map<string, Map<string, number>>();
  for (const t of transactions) {
    const categoryTotals = byCurrency.get(t.currency) ?? new Map<string, number>();
    const key = t.category ?? "Uncategorized";
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + t.amount);
    byCurrency.set(t.currency, categoryTotals);
  }

  return [...byCurrency.entries()].map(([currency, totals]) => ({
    currency,
    data: [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
  }));
}

// Capital deployed by investment type, split per currency, for the
// investments page's "Portfolio Allocation" chart.
export async function getInvestmentAllocation() {
  const investments = await prisma.investment.findMany();

  const byCurrency = new Map<string, Map<string, number>>();
  for (const inv of investments) {
    const typeTotals = byCurrency.get(inv.currency) ?? new Map<string, number>();
    const key = inv.type ?? "Unspecified";
    typeTotals.set(key, (typeTotals.get(key) ?? 0) + inv.amount);
    byCurrency.set(inv.currency, typeTotals);
  }

  return [...byCurrency.entries()].map(([currency, totals]) => ({
    currency,
    data: [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
  }));
}

export async function getInvestmentPortfolio() {
  const investments = await prisma.investment.findMany({
    include: { returns: true, account: true, document: true },
    orderBy: { date: "desc" },
  });

  return investments.map((inv) => {
    const totalReturned = inv.returns.reduce((sum, r) => sum + r.amount, 0);
    return {
      ...inv,
      totalReturned,
      roi: inv.amount > 0 ? (totalReturned - inv.amount) / inv.amount : 0,
    };
  });
}

// Available balance for an account: its transaction balance, minus what's
// already tied up in investments funded from it, plus returns paid back,
// plus/minus transfers in/out. This is the one place this formula lives —
// both the dashboard/investment-picker (plural, below) and the single-account
// gate used when funding an investment or a transfer (singular, further
// below) go through it.
function computeAvailableBalance(account: {
  transactions: { type: string; amount: number }[];
  investments: { amount: number; returns: { amount: number }[] }[];
  transfersOut: { fromAmount: number }[];
  transfersIn: { toAmount: number }[];
}) {
  const transactionBalance = account.transactions.reduce(
    (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
    0
  );
  const totalInvested = account.investments.reduce((sum, i) => sum + i.amount, 0);
  const totalReturned = account.investments.reduce(
    (sum, i) => sum + i.returns.reduce((s, r) => s + r.amount, 0),
    0
  );
  const totalTransferredOut = account.transfersOut.reduce((sum, t) => sum + t.fromAmount, 0);
  const totalTransferredIn = account.transfersIn.reduce((sum, t) => sum + t.toAmount, 0);
  const available =
    transactionBalance - totalInvested + totalReturned + totalTransferredIn - totalTransferredOut;
  return { transactionBalance, totalInvested, totalReturned, available };
}

export async function getAccountInvestableBalances() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      transactions: true,
      investments: { include: { returns: true } },
      transfersOut: true,
      transfersIn: true,
    },
  });

  return accounts.map((account) => ({ account, ...computeAvailableBalance(account) }));
}

export async function getAccountInvestableBalance(accountId: string) {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    include: {
      transactions: true,
      investments: { include: { returns: true } },
      transfersOut: true,
      transfersIn: true,
    },
  });

  return { account, ...computeAvailableBalance(account) };
}

// Full breakdown for a single stream's detail page: every transaction in
// range (not just recent), totals, and its own category split — the
// per-stream "drill in" view the dashboard summary cards link to.
export async function getStreamDetail(streamId: string, selection: RangeSelection) {
  const stream = await prisma.stream.findUniqueOrThrow({ where: { id: streamId } });
  const { start, end } = rangeConfig(selection);

  const transactions = await prisma.transaction.findMany({
    where: { streamId, date: { gte: start, lte: end } },
    include: { account: true, document: true },
    orderBy: { date: "desc" },
  });

  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const totalsByType = (type: "expense" | "income") => {
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== type) continue;
      const key = t.category ?? "Uncategorized";
      totals.set(key, (totals.get(key) ?? 0) + t.amount);
    }
    return [...totals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  const categoryBreakdown = totalsByType("expense");
  const incomeCategoryBreakdown = totalsByType("income");

  return {
    stream,
    transactions,
    income,
    expense,
    net: income - expense,
    categoryBreakdown,
    incomeCategoryBreakdown,
  };
}

export async function getRecentTransactions(limit = 20) {
  return prisma.transaction.findMany({
    include: { account: true, stream: true, document: true },
    orderBy: { date: "desc" },
    take: limit,
  });
}

export async function getRecentTransfers(limit = 20) {
  return prisma.transfer.findMany({
    include: { fromAccount: true, toAccount: true },
    orderBy: { date: "desc" },
    take: limit,
  });
}

export type StatementLine = {
  date: Date;
  description: string;
  debit: number;
  credit: number;
};

export type DateRange = { from?: Date; to?: Date };

// Every real cash movement for an account, merged into one dated ledger:
// transactions, transfers in/out, and investment funding/returns. Scoped to
// match computeAvailableBalance() above so a downloaded statement's running
// balance always reconciles with the "available" figure shown in the app.
// An optional date range filters which lines are included — but the running
// balance is only meaningful as "change over the range" in that case, not a
// true account balance, since anything before `from` is excluded.
export async function getAccountStatementLines(
  accountId: string,
  range?: DateRange
): Promise<StatementLine[]> {
  const dateFilter =
    range?.from || range?.to
      ? { date: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } }
      : {};

  const [transactions, transfersOut, transfersIn, investments, returns] = await Promise.all([
    prisma.transaction.findMany({ where: { accountId, ...dateFilter }, include: { stream: true } }),
    prisma.transfer.findMany({
      where: { fromAccountId: accountId, ...dateFilter },
      include: { toAccount: true },
    }),
    prisma.transfer.findMany({
      where: { toAccountId: accountId, ...dateFilter },
      include: { fromAccount: true },
    }),
    prisma.investment.findMany({ where: { accountId, ...dateFilter } }),
    prisma.investmentReturn.findMany({
      where: { investment: { accountId }, ...dateFilter },
      include: { investment: true },
    }),
  ]);

  const lines: StatementLine[] = [
    ...transactions.map((t) => ({
      date: t.date,
      description: `${t.category ?? t.stream.name}${t.note ? ` — ${t.note}` : ""}`,
      debit: t.type === "expense" ? t.amount : 0,
      credit: t.type === "income" ? t.amount : 0,
    })),
    ...transfersOut.map((tr) => ({
      date: tr.date,
      description: `Transfer to ${tr.toAccount.name}`,
      debit: tr.fromAmount,
      credit: 0,
    })),
    ...transfersIn.map((tr) => ({
      date: tr.date,
      description: `Transfer from ${tr.fromAccount.name}`,
      debit: 0,
      credit: tr.toAmount,
    })),
    ...investments.map((inv) => ({
      date: inv.date,
      description: `Investment: ${inv.name}`,
      debit: inv.amount,
      credit: 0,
    })),
    ...returns.map((r) => ({
      date: r.date,
      description: `Return: ${r.investment.name}`,
      debit: 0,
      credit: r.amount,
    })),
  ];

  lines.sort((a, b) => a.date.getTime() - b.date.getTime());
  return lines;
}
