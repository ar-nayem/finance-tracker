import { prisma } from "@/lib/prisma";
import { buildTransactionInvoicePdf } from "@/lib/invoice";
import { verifySession } from "@/lib/session";

export async function GET(_req: Request, ctx: RouteContext<"/transactions/[id]/invoice">) {
  await verifySession();
  const { id } = await ctx.params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { account: true, stream: true },
  });
  if (!transaction) return new Response("Not found", { status: 404 });

  const bytes = await buildTransactionInvoicePdf(transaction);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${transaction.id.slice(0, 8)}.pdf"`,
    },
  });
}
