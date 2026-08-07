import { prisma } from "@/lib/prisma";
import { buildTransactionInvoicePdf } from "@/lib/invoice";
import { verifySession } from "@/lib/session";
import { getUserBranding } from "@/lib/data";

export async function GET(_req: Request, ctx: RouteContext<"/transactions/[id]/invoice">) {
  const { userId } = await verifySession();
  const { id } = await ctx.params;

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
    include: { account: true, stream: true },
  });
  if (!transaction) return new Response("Not found", { status: 404 });

  const branding = await getUserBranding(userId);
  const bytes = await buildTransactionInvoicePdf(transaction, branding);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${transaction.id.slice(0, 8)}.pdf"`,
    },
  });
}
