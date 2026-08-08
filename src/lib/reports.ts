import { startOfMonth, endOfMonth, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getStreamSummariesForPeriod } from "@/lib/data";
import { formatMoney } from "@/lib/format";

// Emails always cover a whole calendar month (the previous one, when driven
// by the cron script) — never "the last 30 days" — so the subject line
// matches what a user expects from a monthly statement.
export async function buildMonthlyReportEmail(userId: string, monthDate: Date) {
  const from = startOfMonth(monthDate);
  const to = endOfMonth(monthDate);
  const monthLabel = format(monthDate, "MMMM yyyy");

  const summaries = await getStreamSummariesForPeriod(userId, { kind: "custom", from, to });
  const withActivity = summaries.filter((s) => s.income !== 0 || s.expense !== 0);

  const lines = withActivity.map(
    (s) =>
      `${s.stream.name} (${s.stream.currency}): income ${formatMoney(s.income, s.stream.currency)}, ` +
      `expense ${formatMoney(s.expense, s.stream.currency)}, net ${formatMoney(s.net, s.stream.currency)}`
  );

  const text =
    withActivity.length > 0
      ? `Your ${monthLabel} summary:\n\n${lines.join("\n")}`
      : `No transactions recorded for ${monthLabel}.`;

  const rows =
    withActivity.length > 0
      ? withActivity
          .map(
            (s) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">${s.stream.name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${formatMoney(s.income, s.stream.currency)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${formatMoney(s.expense, s.stream.currency)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${formatMoney(s.net, s.stream.currency)}</td>
        </tr>`
          )
          .join("")
      : `<tr><td style="padding:6px 12px;">No transactions recorded.</td></tr>`;

  const html = `
    <div style="font-family:sans-serif;color:#111;">
      <h2>${monthLabel} summary</h2>
      <table style="border-collapse:collapse;width:100%;max-width:480px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 12px;">Stream</th>
            <th style="text-align:right;padding:6px 12px;">Income</th>
            <th style="text-align:right;padding:6px 12px;">Expense</th>
            <th style="text-align:right;padding:6px 12px;">Net</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  return { subject: `Finance Tracker: ${monthLabel} summary`, text, html };
}

// Singleton row — created with defaults (disabled) on first read so every
// caller can assume it exists instead of null-checking everywhere.
export async function getReportSchedule() {
  const existing = await prisma.reportSchedule.findFirst();
  if (existing) return existing;
  return prisma.reportSchedule.create({ data: {} });
}

export async function getUsersWithReportEmail() {
  return prisma.user.findMany({ where: { email: { not: null }, disabled: false } });
}
