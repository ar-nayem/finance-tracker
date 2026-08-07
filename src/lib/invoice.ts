import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFImage } from "pdf-lib";
import { formatDate, formatMoney } from "@/lib/format";
import type { StatementLine } from "@/lib/data";

export type Branding = { displayName: string | null; logoDataUrl: string | null };

// pdf-lib only embeds PNG/JPEG natively; other image types (webp, gif, ...)
// just fall back to no logo in the PDF rather than throwing — the nav bar
// still shows them fine since a browser <img> isn't limited the same way.
async function embedLogo(doc: PDFDocument, dataUrl: string | null | undefined): Promise<PDFImage | null> {
  if (!dataUrl) return null;
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  try {
    if (mime === "image/png") return await doc.embedPng(bytes);
    if (mime === "image/jpeg" || mime === "image/jpg") return await doc.embedJpg(bytes);
  } catch {
    return null;
  }
  return null;
}

// Draws the logo (if any) to the left of the brand-name title at (x, y) and
// returns the x the title text should start at.
function drawBrandMark(
  page: import("pdf-lib").PDFPage,
  logo: PDFImage | null,
  x: number,
  y: number
): number {
  if (!logo) return x;
  const size = 22;
  page.drawImage(logo, { x, y: y - 4, width: size, height: size });
  return x + size + 8;
}

type InvoiceTransaction = {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  type: string;
  category: string | null;
  note: string | null;
  account: { name: string };
  stream: { name: string };
};

const ACCENT = rgb(0.29, 0.34, 0.9);
const MUTED = rgb(0.45, 0.45, 0.48);
const INK = rgb(0.1, 0.1, 0.12);
const GOOD = rgb(0.1, 0.55, 0.35);
const BAD = rgb(0.75, 0.2, 0.2);

// formatMoney()'s output for this app's two currencies (RMB -> "CN¥1,234",
// BDT -> "BDT 1,234") only uses characters within pdf-lib's default WinAnsi
// encoding, so the standard Helvetica fonts are enough here — no fontkit /
// custom font needed. Revisit if a currency using non-Latin glyphs is added.
export async function buildTransactionInvoicePdf(
  transaction: InvoiceTransaction,
  branding?: Branding
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(doc, branding?.logoDataUrl);
  const brandName = branding?.displayName || "Finance Tracker";

  let y = height - 72;

  const titleX = drawBrandMark(page, logo, 56, y);
  page.drawText(brandName, { x: titleX, y, size: 20, font: bold, color: ACCENT });
  y -= 22;
  page.drawText("Transaction Receipt", { x: 56, y, size: 13, font, color: MUTED });

  const receiptNo = `TXN-${transaction.id.slice(0, 8).toUpperCase()}`;
  page.drawText(receiptNo, { x: width - 56 - bold.widthOfTextAtSize(receiptNo, 12), y: height - 72, size: 12, font: bold, color: INK });
  const issued = `Issued ${formatDate(new Date())}`;
  page.drawText(issued, { x: width - 56 - font.widthOfTextAtSize(issued, 10), y: height - 88, size: 10, font, color: MUTED });

  y -= 36;
  page.drawLine({ start: { x: 56, y }, end: { x: width - 56, y }, thickness: 1, color: rgb(0.85, 0.85, 0.87) });
  y -= 36;

  const isIncome = transaction.type === "income";
  const badgeText = isIncome ? "INCOME" : "EXPENSE";
  const badgeColor = isIncome ? GOOD : BAD;
  page.drawText(badgeText, { x: 56, y, size: 11, font: bold, color: badgeColor });
  y -= 30;

  const row = (label: string, value: string) => {
    page.drawText(label, { x: 56, y, size: 10, font, color: MUTED });
    page.drawText(value, { x: 220, y, size: 11, font: bold, color: INK });
    y -= 26;
  };

  row("Date", formatDate(transaction.date));
  row("Stream", transaction.stream.name);
  row("Account", transaction.account.name);
  row("Category", transaction.category ?? "—");
  row("Note", transaction.note ?? "—");

  y -= 14;
  page.drawLine({ start: { x: 56, y }, end: { x: width - 56, y }, thickness: 1, color: rgb(0.85, 0.85, 0.87) });
  y -= 40;

  page.drawText("Amount", { x: 56, y, size: 11, font, color: MUTED });
  const amountText = `${isIncome ? "+" : "-"}${formatMoney(transaction.amount, transaction.currency)}`;
  page.drawText(amountText, {
    x: width - 56 - bold.widthOfTextAtSize(amountText, 22),
    y: y - 6,
    size: 22,
    font: bold,
    color: isIncome ? GOOD : BAD,
  });

  const footer = `System-generated receipt · ${new Date().toISOString()}`;
  page.drawText(footer, { x: 56, y: 48, size: 8, font, color: MUTED });

  return doc.save();
}

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const ROW_HEIGHT = 20;

type StatementColumn = { label: string; x: number; width: number; align?: "right" };

// Widths sized to end at PAGE_SIZE[0] - MARGIN (539.28pt) — the same right
// boundary every other element on the page respects.
const STATEMENT_COLUMNS: StatementColumn[] = [
  { label: "Date", x: MARGIN, width: 60 },
  { label: "Description", x: MARGIN + 68, width: 195 },
  { label: "Debit", x: MARGIN + 271, width: 65, align: "right" },
  { label: "Credit", x: MARGIN + 344, width: 65, align: "right" },
  { label: "Balance", x: MARGIN + 417, width: 65, align: "right" },
];

export async function buildAccountStatementPdf(
  account: { name: string; currency: string },
  lines: StatementLine[],
  range: { from?: Date; to?: Date },
  branding?: Branding
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(doc, branding?.logoDataUrl);
  const brandName = branding?.displayName || "Finance Tracker";

  let page = doc.addPage(PAGE_SIZE);
  let { width, height } = page.getSize();
  let y = height - MARGIN;

  const drawColumnHeaders = () => {
    for (const col of STATEMENT_COLUMNS) {
      const textWidth = bold.widthOfTextAtSize(col.label, 9);
      const x = col.align === "right" ? col.x + col.width - textWidth : col.x;
      page.drawText(col.label, { x, y, size: 9, font: bold, color: MUTED });
    }
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.87) });
    y -= ROW_HEIGHT;
  };

  const newPage = () => {
    page = doc.addPage(PAGE_SIZE);
    ({ width, height } = page.getSize());
    y = height - MARGIN;
    drawColumnHeaders();
  };

  const descriptionColumnWidth = STATEMENT_COLUMNS[1].width;
  const truncateToWidth = (text: string, maxWidth: number) => {
    if (font.widthOfTextAtSize(text, 9) <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 1 && font.widthOfTextAtSize(truncated + "…", 9) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "…";
  };

  const titleX = drawBrandMark(page, logo, MARGIN, y);
  page.drawText(brandName, { x: titleX, y, size: 20, font: bold, color: ACCENT });
  y -= 22;
  page.drawText(`Account Statement — ${account.name}`, { x: MARGIN, y, size: 13, font, color: MUTED });

  const rangeText = `${range.from ? formatDate(range.from) : "Account opening"} to ${range.to ? formatDate(range.to) : "today"}`;
  page.drawText(rangeText, {
    x: width - MARGIN - font.widthOfTextAtSize(rangeText, 10),
    y: height - MARGIN,
    size: 10,
    font,
    color: MUTED,
  });
  const issued = `Issued ${formatDate(new Date())}`;
  page.drawText(issued, {
    x: width - MARGIN - font.widthOfTextAtSize(issued, 10),
    y: height - MARGIN - 16,
    size: 10,
    font,
    color: MUTED,
  });

  y -= 30;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 1, color: rgb(0.85, 0.85, 0.87) });
  y -= 26;
  drawColumnHeaders();

  let balance = 0;
  for (const line of lines) {
    if (y < MARGIN + 60) newPage();
    balance += line.credit - line.debit;

    const cells = [
      line.date.toISOString().slice(0, 10),
      truncateToWidth(line.description, descriptionColumnWidth),
      line.debit ? formatMoney(line.debit, account.currency) : "",
      line.credit ? formatMoney(line.credit, account.currency) : "",
      formatMoney(balance, account.currency),
    ];

    STATEMENT_COLUMNS.forEach((col, i) => {
      const text = cells[i];
      const textWidth = font.widthOfTextAtSize(text, 9);
      const x = col.align === "right" ? col.x + col.width - textWidth : col.x;
      page.drawText(text, { x, y, size: 9, font, color: INK });
    });
    y -= ROW_HEIGHT;
  }

  if (lines.length === 0) {
    page.drawText("No activity in this period.", { x: MARGIN, y, size: 10, font, color: MUTED });
    y -= ROW_HEIGHT;
  }

  if (y < MARGIN + 60) newPage();

  y -= 10;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: width - MARGIN, y }, thickness: 1, color: rgb(0.85, 0.85, 0.87) });
  y -= 24;

  page.drawText("Closing balance", { x: MARGIN, y, size: 11, font, color: MUTED });
  const closingValue = formatMoney(balance, account.currency);
  page.drawText(closingValue, {
    x: width - MARGIN - bold.widthOfTextAtSize(closingValue, 14),
    y: y - 2,
    size: 14,
    font: bold,
    color: balance >= 0 ? GOOD : BAD,
  });

  const footer = `System-generated statement · ${new Date().toISOString()}`;
  page.drawText(footer, { x: MARGIN, y: 32, size: 8, font, color: MUTED });

  return doc.save();
}
