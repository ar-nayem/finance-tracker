import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

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

// Every real cash movement for an account, merged into one dated ledger:
// transactions, transfers in/out, and investment funding/returns. Scoped to
// match computeAvailableBalance() above so a downloaded statement's running
// balance always reconciles with the "available" figure shown in the app.
export async function getAccountStatementLines(accountId: string): Promise<StatementLine[]> {
  const [transactions, transfersOut, transfersIn, investments, returns] = await Promise.all([
    prisma.transaction.findMany({ where: { accountId }, include: { stream: true } }),
    prisma.transfer.findMany({ where: { fromAccountId: accountId }, include: { toAccount: true } }),
    prisma.transfer.findMany({ where: { toAccountId: accountId }, include: { fromAccount: true } }),
    prisma.investment.findMany({ where: { accountId } }),
    prisma.investmentReturn.findMany({ where: { investment: { accountId } }, include: { investment: true } }),
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
