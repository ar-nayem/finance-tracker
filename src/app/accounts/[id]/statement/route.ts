import { prisma } from "@/lib/prisma";
import { getAccountStatementLines } from "@/lib/data";
import { verifySession } from "@/lib/session";

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(_req: Request, ctx: RouteContext<"/accounts/[id]/statement">) {
  await verifySession();
  const { id } = await ctx.params;

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return new Response("Not found", { status: 404 });

  const lines = await getAccountStatementLines(id);

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

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${account.name.replace(/"/g, "")}-statement.csv"`,
    },
  });
}
