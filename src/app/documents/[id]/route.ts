import { prisma } from "@/lib/prisma";
import { readDocumentFile } from "@/lib/documents";
import { verifySession } from "@/lib/session";

export async function GET(_req: Request, ctx: RouteContext<"/documents/[id]">) {
  const { userId } = await verifySession();
  const { id } = await ctx.params;

  const document = await prisma.document.findFirst({ where: { id, userId } });
  if (!document) return new Response("Not found", { status: 404 });

  const bytes = await readDocumentFile(document.filePath);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(document.fileSize),
    },
  });
}
