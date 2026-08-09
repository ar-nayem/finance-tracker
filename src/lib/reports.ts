import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getStreamSummariesForPeriod } from "@/lib/data";
import { formatMoney, formatDate } from "@/lib/format";
import { buildMonthlyReportPdf, type Branding } from "@/lib/invoice";
import { buildMonthlyReportXlsx } from "@/lib/xlsx";

// Shared by the email body and both attachment builders below, so "which
// transactions count" is defined in exactly one place. Zero-activity
// streams are dropped — a report full of $0 rows for streams that saw no
// activity in range isn't useful.
async function getReportRows(userId: string, from: Date, to: Date) {
  const summaries = await getStreamSummariesForPeriod(userId, { kind: "custom", from, to });
  return summaries.filter((s) => s.income !== 0 || s.expense !== 0);
}

export async function buildReportEmail(userId: string, from: Date, to: Date, label: string) {
  const withActivity = await getReportRows(userId, from, to);

  const lines = withActivity.map(
    (s) =>
      `${s.stream.name} (${s.stream.currency}): income ${formatMoney(s.income, s.stream.currency)}, ` +
      `expense ${formatMoney(s.expense, s.stream.currency)}, net ${formatMoney(s.net, s.stream.currency)}`
  );

  const text =
    withActivity.length > 0
      ? `Your ${label} summary:\n\n${lines.join("\n")}`
      : `No transactions recorded for ${label}.`;

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
      <h2>${label} summary</h2>
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

  return { subject: `Finance Tracker: ${label} summary`, text, html };
}

// PDF/XLSX copies of the same data as the email body, for users who want to
// file or forward the report rather than just read it inline.
export async function buildReportAttachments(
  userId: string,
  from: Date,
  to: Date,
  label: string,
  filenameBase: string,
  branding?: Branding
) {
  const rows = await getReportRows(userId, from, to);

  const [pdf, xlsx] = await Promise.all([
    buildMonthlyReportPdf(label, rows, branding),
    buildMonthlyReportXlsx(label, rows),
  ]);

  return [
    { filename: `report-${filenameBase}.pdf`, content: Buffer.from(pdf) },
    { filename: `report-${filenameBase}.xlsx`, content: xlsx },
  ];
}

// Emails always cover a whole calendar month (the previous one, when driven
// by the cron script) — never "the last 30 days" — so the subject line
// matches what a user expects from a monthly statement. Thin wrapper around
// the generic range builders above, used by the cron script and the "send
// now" test button; adminSendCustomStatement (actions.ts) calls the generic
// builders directly with an admin-picked range instead of a calendar month.
export async function buildMonthlyReportEmail(userId: string, monthDate: Date) {
  return buildReportEmail(userId, startOfMonth(monthDate), endOfMonth(monthDate), format(monthDate, "MMMM yyyy"));
}

export async function buildMonthlyReportAttachments(userId: string, monthDate: Date, branding?: Branding) {
  return buildReportAttachments(
    userId,
    startOfMonth(monthDate),
    endOfMonth(monthDate),
    format(monthDate, "MMMM yyyy"),
    format(monthDate, "yyyy-MM"),
    branding
  );
}

// Label + filename-safe range description shared by the custom-statement
// action and (if ever needed) anywhere else that sends an arbitrary range —
// "Aug 1, 2026 – Aug 9, 2026" for the subject/heading, "2026-08-01_to_2026-08-09"
// for the attachment filenames.
export function describeCustomRange(from: Date, to: Date) {
  return {
    from: startOfDay(from),
    to: endOfDay(to),
    label: `${formatDate(from)} – ${formatDate(to)}`,
    filenameBase: `${format(from, "yyyy-MM-dd")}_to_${format(to, "yyyy-MM-dd")}`,
  };
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
