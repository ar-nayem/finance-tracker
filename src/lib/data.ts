import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function getStreams() {
  return prisma.stream.findMany({ orderBy: { createdAt: "asc" } });
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
      const [transactionCount, investmentCount] = await Promise.all([
        prisma.transaction.count({ where: { accountId: account.id } }),
        prisma.investment.count({ where: { accountId: account.id } }),
      ]);
      return { account, transactionCount, investmentCount };
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

export async function getStreamSummaries() {
  const streams = await getStreams();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const summaries = await Promise.all(
    streams.map(async (stream) => {
      const transactions = await prisma.transaction.findMany({
        where: { streamId: stream.id, date: { gte: monthStart, lte: monthEnd } },
      });
      const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      return { stream, income, expense, net: income - expense };
    })
  );

  return summaries;
}

export async function getMonthlyTrend(monthsBack = 6) {
  const streams = await getStreams();
  const now = new Date();
  const months = Array.from({ length: monthsBack }, (_, i) => subMonths(now, monthsBack - 1 - i));

  const trend = await Promise.all(
    months.map(async (monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const row: Record<string, string | number> = { month: format(monthDate, "MMM") };

      for (const stream of streams) {
        const transactions = await prisma.transaction.findMany({
          where: { streamId: stream.id, date: { gte: monthStart, lte: monthEnd } },
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

export async function getInvestmentPortfolio() {
  const investments = await prisma.investment.findMany({
    include: { returns: true, account: true },
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

// Available to invest from an account: its transaction balance, minus what's
// already tied up in investments funded from it, plus returns paid back.
export async function getAccountInvestableBalances() {
  const accounts = await prisma.account.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      transactions: true,
      investments: { include: { returns: true } },
    },
  });

  return accounts.map((account) => {
    const transactionBalance = account.transactions.reduce(
      (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
      0
    );
    const totalInvested = account.investments.reduce((sum, i) => sum + i.amount, 0);
    const totalReturned = account.investments.reduce(
      (sum, i) => sum + i.returns.reduce((s, r) => s + r.amount, 0),
      0
    );
    const available = transactionBalance - totalInvested + totalReturned;
    return { account, transactionBalance, totalInvested, totalReturned, available };
  });
}

export async function getRecentTransactions(limit = 20) {
  return prisma.transaction.findMany({
    include: { account: true, stream: true },
    orderBy: { date: "desc" },
    take: limit,
  });
}
