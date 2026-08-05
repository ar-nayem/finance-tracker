import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

// Files live outside `public/` on purpose: downloads go through the
// session-checked route handler in app/documents/[id]/route.ts instead of
// being served as static assets anyone with the URL could hit.
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

export async function saveDocumentFile(file: File): Promise<{ filePath: string; fileSize: number }> {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const storedName = `${crypto.randomUUID()}-${file.name}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, storedName), bytes);
  return { filePath: storedName, fileSize: bytes.length };
}

export async function readDocumentFile(filePath: string): Promise<Buffer> {
  return readFile(path.join(UPLOADS_DIR, filePath));
}

export async function deleteDocumentFile(filePath: string): Promise<void> {
  await unlink(path.join(UPLOADS_DIR, filePath)).catch(() => {});
}
