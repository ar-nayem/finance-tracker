import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAccountStatementLines } from "@/lib/data";
import { verifySession } from "@/lib/session";

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(req: Request, ctx: RouteContext<"/accounts/[id]/statement">) {
  const { userId } = await verifySession();
  const { id } = await ctx.params;

  const account = await prisma.account.findFirst({ where: { id, userId } });
  if (!account) return new Response("Not found", { status: 404 });

  const { searchParams } = new URL(req.url);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  // Date-only inputs parse to UTC midnight — without extending `to` through
  // the end of that day, a transaction dated exactly on the `to` day would
  // fall after the boundary and get silently excluded.
  const from = fromRaw ? startOfDay(new Date(fromRaw)) : undefined;
  const to = toRaw ? endOfDay(new Date(toRaw)) : undefined;

  const lines = await getAccountStatementLines(userId, id, { from, to });

  let balance = 0;
  const rows = lines.map((line) => {
    balance += line.credit - line.debit;
    return [
      line.date.toISOString().slice(0, 10),
      csvField(line.description),
      line.debit ? line.debit.toFixed(2) : "",
      line.credit ? line.credit.toFixed(2) : "",
      balance.toFixed(2),
      account.currency,
    ].join(",");
  });

  const csv = ["Date,Description,Debit,Credit,Balance,Currency", ...rows].join("\n") + "\n";
  const suffix = fromRaw || toRaw ? `-${fromRaw ?? "start"}_to_${toRaw ?? "now"}` : "";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${account.name.replace(/"/g, "")}-statement${suffix}.csv"`,
    },
  });
}
