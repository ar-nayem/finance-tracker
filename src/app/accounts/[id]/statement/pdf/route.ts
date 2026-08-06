import { prisma } from "@/lib/prisma";
import { getAccountStatementLines } from "@/lib/data";
import { buildAccountStatementPdf } from "@/lib/invoice";
import { verifySession } from "@/lib/session";

export async function GET(req: Request, ctx: RouteContext<"/accounts/[id]/statement/pdf">) {
  await verifySession();
  const { id } = await ctx.params;

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return new Response("Not found", { status: 404 });

  const { searchParams } = new URL(req.url);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;

  const lines = await getAccountStatementLines(id, { from, to });
  const bytes = await buildAccountStatementPdf(account, lines, { from, to });
  const suffix = fromRaw || toRaw ? `-${fromRaw ?? "start"}_to_${toRaw ?? "now"}` : "";

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${account.name.replace(/"/g, "")}-statement${suffix}.pdf"`,
    },
  });
}
