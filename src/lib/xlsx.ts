import ExcelJS from "exceljs";

type ReportRow = { stream: { name: string; currency: string }; income: number; expense: number; net: number };

export async function buildMonthlyReportXlsx(monthLabel: string, rows: ReportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Finance Tracker";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(monthLabel.replace(/[\\/*?:[\]]/g, ""));
  sheet.columns = [
    { header: "Stream", key: "stream", width: 24 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Income", key: "income", width: 14 },
    { header: "Expense", key: "expense", width: 14 },
    { header: "Net", key: "net", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      stream: row.stream.name,
      currency: row.stream.currency,
      income: row.income,
      expense: row.expense,
      net: row.net,
    });
  }
  ["income", "expense", "net"].forEach((key) => {
    sheet.getColumn(key).numFmt = "#,##0.00";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
