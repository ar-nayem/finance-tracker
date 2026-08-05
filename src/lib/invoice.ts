import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDate, formatMoney } from "@/lib/format";

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
export async function buildTransactionInvoicePdf(transaction: InvoiceTransaction): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 72;

  page.drawText("Finance Tracker", { x: 56, y, size: 20, font: bold, color: ACCENT });
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
