import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAccountStatementLines, getUserBranding } from "@/lib/data";
import { buildAccountStatementPdf } from "@/lib/invoice";
import { verifySession } from "@/lib/session";

export async function GET(req: Request, ctx: RouteContext<"/accounts/[id]/statement/pdf">) {
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
  const branding = await getUserBranding(userId);
  const bytes = await buildAccountStatementPdf(account, lines, { from, to }, branding);
  const suffix = fromRaw || toRaw ? `-${fromRaw ?? "start"}_to_${toRaw ?? "now"}` : "";

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${account.name.replace(/"/g, "")}-statement${suffix}.pdf"`,
    },
  });
}
